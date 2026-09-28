import "server-only";

import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { getProducts } from "@/lib/data";
import { grantLibraryItem } from "@/lib/library";
import {
  currentPeriod,
  DEFAULT_PLUS_PLANS,
  isPlanAtLeast,
  normalizeClaim,
  normalizeClubBox,
  normalizeDrop,
  normalizePlusPlans,
  normalizeSubscription,
  type ClubBox,
  type DropClaim,
  type PlusDrop,
  type PlusDropView,
  type PlusPlan,
  type PlusState,
  type PlusSubscription,
  type PlusWeekProgress,
} from "@/lib/plus-fields";
import type { LibraryItem, Product } from "@/lib/types";

/**
 * Cliffhanger+ (§15 conta / §24–§26 admin) — persistência no Firestore:
 *
 * - `subscriptions/{uid}`  → assinatura pessoal (billing simulado)
 * - `drops/{id}`           → Drops configurados pelo painel (§25)
 * - `drops/{id}/claims/{uid}` não existe: os resgates ficam em `dropClaims`
 *   (doc `${dropId}__${uid}`) para consulta por usuário E por Drop (§25)
 * - `clubBoxes`            → caixas do Clube do Leitor (§26)
 * - `site/plus`            → sobrescrita de planos feita pelo painel (§24)
 *
 * Todos os helpers são tolerantes: sem Firestore, devolvem vazio/padrão.
 */

export function isPlusActive(sub: PlusSubscription | null): sub is PlusSubscription {
  return Boolean(sub && sub.status === "ativo");
}

// ---------------------------------------------------------------------------
// Planos e assinatura
// ---------------------------------------------------------------------------

/** Catálogo de planos: padrão (§24) sobrescrito por `site/plus` quando existir. */
export async function getPlusPlans(): Promise<PlusPlan[]> {
  try {
    const db = getAdminDb();
    if (!db) return DEFAULT_PLUS_PLANS;
    const snap = await db.collection("site").doc("plus").get();
    if (!snap.exists) return DEFAULT_PLUS_PLANS;
    const data = revive(snap.data()) as { plans?: unknown };
    const plans = normalizePlusPlans(data.plans);
    return plans.length > 0 ? plans : DEFAULT_PLUS_PLANS;
  } catch {
    return DEFAULT_PLUS_PLANS;
  }
}

export async function getSubscription(uid: string): Promise<PlusSubscription | null> {
  if (!uid) return null;
  try {
    const db = getAdminDb();
    if (!db) return null;
    const snap = await db.collection("subscriptions").doc(uid).get();
    if (!snap.exists) return null;
    return normalizeSubscription(uid, revive(snap.data()));
  } catch {
    return null;
  }
}

export async function saveSubscription(
  sub: PlusSubscription,
): Promise<PlusSubscription | null> {
  try {
    const db = getAdminDb();
    if (!db) return null;
    const now = new Date().toISOString();
    const next: PlusSubscription = { ...sub, updatedAt: now };
    await db.collection("subscriptions").doc(next.uid).set(plainDoc(next));
    return next;
  } catch {
    return null;
  }
}

/** Próxima cobrança simulada: mesmo dia do mês seguinte. */
export function nextBillingFrom(now: Date = new Date()): string {
  const next = new Date(now.getTime());
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + 1);
  // volta para o dia válido quando o mês alvo é mais curto (31 → 28/29/30)
  if (next.getUTCDate() < day) next.setUTCDate(0);
  return next.toISOString();
}

// ---------------------------------------------------------------------------
// Drops e resgates
// ---------------------------------------------------------------------------

/** Drops ativos (o painel grava; aqui só lemos e filtramos a janela). */
export async function listDrops(): Promise<PlusDrop[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];
    const snap = await db.collection("drops").orderBy("week", "asc").limit(60).get();
    return snap.docs
      .map((doc) => normalizeDrop(doc.id, revive(doc.data())))
      .filter((d): d is PlusDrop => d !== null);
  } catch {
    return [];
  }
}

/** Resgates do usuário (consulta de campo único — sem índice composto). */
export async function listClaims(uid: string): Promise<DropClaim[]> {
  if (!uid) return [];
  try {
    const db = getAdminDb();
    if (!db) return [];
    const snap = await db.collection("dropClaims").where("uid", "==", uid).limit(60).get();
    return snap.docs
      .map((doc) => normalizeClaim(doc.id, revive(doc.data())))
      .filter((c): c is DropClaim => c !== null);
  } catch {
    return [];
  }
}

export async function getDrop(dropId: string): Promise<PlusDrop | null> {
  try {
    const db = getAdminDb();
    if (!db || !dropId) return null;
    const snap = await db.collection("drops").doc(dropId).get();
    if (!snap.exists) return null;
    return normalizeDrop(dropId, revive(snap.data()));
  } catch {
    return null;
  }
}

export type ClaimResult =
  | { ok: true; claim: DropClaim; granted: boolean; alreadyHad: boolean }
  | { ok: false; status: number; error: string };

/**
 * Resgata um Drop para a conta (§25). Temporário: entra na biblioteca
 * enquanto a assinatura estiver ativa. Permanente: é gravado em
 * `libraries/{uid}` e continua lá mesmo após o cancelamento (§25).
 */
export async function claimDrop(params: {
  uid: string;
  email?: string;
  drop: PlusDrop;
  subscription: PlusSubscription;
  products: Product[];
}): Promise<ClaimResult> {
  const { uid, email, drop, subscription, products } = params;
  const now = new Date();

  if (!isPlusActive(subscription)) {
    return { ok: false, status: 403, error: "Assinatura ativa necessária para resgatar Drops." };
  }
  if (!drop.active) {
    return { ok: false, status: 409, error: "Este Drop não está mais ativo." };
  }
  const at = now.getTime();
  const starts = drop.startsAt ? new Date(drop.startsAt).getTime() : 0;
  const ends = drop.endsAt ? new Date(drop.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
  if ((starts && at < starts) || (ends && at > ends)) {
    return { ok: false, status: 409, error: "Este Drop está fora da janela de disponibilidade." };
  }
  if (!isPlanAtLeast(subscription.plan, drop.minPlan)) {
    return { ok: false, status: 403, error: `Resgate exclusivo para o plano ${drop.minPlan}.` };
  }

  const product = drop.productId
    ? products.find((p) => p.id === drop.productId && p.digital)
    : undefined;
  if (drop.kind !== "obra" && !product) {
    return { ok: false, status: 409, error: "Conteúdo do Drop indisponível no momento." };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, status: 503, error: "Firestore não configurado neste ambiente." };
  }

  const claimId = `${drop.id}__${uid}`;
  try {
    const ref = db.collection("dropClaims").doc(claimId);
    const existing = await ref.get();
    if (existing.exists) {
      const claim = normalizeClaim(claimId, revive(existing.data()));
      if (claim) return { ok: true, claim, granted: false, alreadyHad: true };
    }

    const claim: DropClaim = {
      id: claimId,
      dropId: drop.id,
      uid,
      email,
      permanence: drop.permanence,
      productId: product?.id,
      period: drop.period || currentPeriod(now),
      week: drop.week,
      claimedAt: now.toISOString(),
    };

    await ref.set(plainDoc(claim));

    // Permanente + digital → licença gravada de vez na biblioteca (§25).
    let granted = false;
    if (drop.permanence === "permanente" && product) {
      granted = await grantLibraryItem(uid, product);
    }

    return { ok: true, claim, granted, alreadyHad: false };
  } catch {
    return { ok: false, status: 500, error: "Falha ao registrar o resgate." };
  }
}

// ---------------------------------------------------------------------------
// Clube do Leitor
// ---------------------------------------------------------------------------

export async function listClubBoxes(): Promise<ClubBox[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];
    const snap = await db.collection("clubBoxes").orderBy("month", "desc").limit(12).get();
    return snap.docs
      .map((doc) => normalizeClubBox(doc.id, revive(doc.data())))
      .filter((b): b is ClubBox => b !== null);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Estado da página da conta
// ---------------------------------------------------------------------------

/** Estado completo para `/conta/cliffhanger-plus` e para o dashboard (§2). */
export async function getPlusState(uid: string): Promise<PlusState> {
  const [plans, subscription, allDrops, claims, boxes] = await Promise.all([
    getPlusPlans(),
    getSubscription(uid),
    listDrops(),
    listClaims(uid),
    listClubBoxes(),
  ]);

  const active = isPlusActive(subscription);
  const claimedIds = new Set(claims.map((c) => c.dropId));
  const now = Date.now();
  const period = currentPeriod();

  const drops: PlusDropView[] = allDrops.map((drop) => {
    const claimed = claimedIds.has(drop.id);
    const starts = drop.startsAt ? new Date(drop.startsAt).getTime() : 0;
    const ends = drop.endsAt ? new Date(drop.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
    let blocked: PlusDropView["blocked"] | undefined;
    if (claimed) blocked = "resgatado";
    else if (!drop.active) blocked = "inativo";
    else if ((starts && now < starts) || (ends && now > ends)) blocked = "janela";
    else if (!active) blocked = "assinatura";
    else if (subscription && !isPlanAtLeast(subscription.plan, drop.minPlan))
      blocked = "plano";
    return {
      ...drop,
      claimed,
      claimable: !blocked,
      ...(blocked ? { blocked } : {}),
    };
  });

  const claimedPeriods = new Set(
    claims.filter((c) => c.period === period).map((c) => c.week),
  );
  const progress: PlusWeekProgress[] = [1, 2, 3, 4].map((week) => ({
    week,
    claimed: claimedPeriods.has(week),
  }));

  const userPlan = subscription?.plan ?? null;
  const clubEligible =
    active && userPlan !== null && (userPlan === "gold" || userPlan === "premium");
  const boxesForUser = boxes.filter(
    (box) => active && userPlan !== null && box.eligibility.includes(userPlan),
  );

  return {
    active,
    plans,
    subscription,
    drops,
    period,
    progress,
    club: { eligible: clubEligible, boxes: boxesForUser },
  };
}

// ---------------------------------------------------------------------------
// Acesso via assinatura na biblioteca digital
// ---------------------------------------------------------------------------

/** Item de biblioteca montado a partir do produto (acesso via assinatura). */
function accessItemFromProduct(product: Product, purchasedAt: string): LibraryItem {
  return {
    id: `item-${product.id}`,
    productId: product.id,
    title: product.title,
    slug: product.slug,
    type: product.type === "audiobook" ? "audiobook" : "ebook",
    files: (product.files ?? []).map((f) => ({ ...f })),
    purchasedAt,
    source: "plus",
  };
}

/**
 * Acesso concedido pela assinatura (§23 — "conteúdos que o usuário pode
 * acessar através de uma assinatura"):
 *
 * 1. Drops temporários resgatados → enquanto a assinatura estiver ativa;
 * 2. Premium → catálogo completo de digitais enquanto assinar (§24).
 *
 * Itens PERMANENTES já estão em `libraries/{uid}` (gravados no resgate),
 * por isso não são remontados aqui — e sobrevivem ao cancelamento.
 */
export async function withPlusAccess(
  uid: string,
  items: LibraryItem[],
): Promise<LibraryItem[]> {
  try {
    const subscription = await getSubscription(uid);
    if (!isPlusActive(subscription)) return items;

    const owned = new Set(items.map((i) => i.productId));
    const extra: LibraryItem[] = [];
    const now = new Date().toISOString();

    const add = (product: Product | undefined): void => {
      if (!product || owned.has(product.id) || !product.digital) return;
      if (product.badge === "PRÉ-VENDA") return;
      if ((product.files ?? []).length === 0) return;
      owned.add(product.id);
      extra.push(accessItemFromProduct(product, now));
    };

    const claims = await listClaims(uid);
    const temporary = claims.filter((c) => c.permanence === "temporario");
    const products = await getProducts();

    for (const claim of temporary) {
      add(claim.productId ? products.find((p) => p.id === claim.productId) : undefined);
    }

    // §24 — Premium: biblioteca completa enquanto a assinatura estiver ativa.
    if (subscription.plan === "premium") {
      for (const product of products) add(product);
    }

    return extra.length > 0 ? [...items, ...extra] : items;
  } catch {
    return items;
  }
}

/** Frete grátis do Essential+ (§24) — usado por `/api/shipping` e `/api/orders`. */
export async function hasFreeShipping(uid: string | null): Promise<boolean> {
  if (!uid) return false;
  return isPlusActive(await getSubscription(uid));
}
