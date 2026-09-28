import "server-only";

import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { getPlusPlans } from "@/lib/plus";
import {
  EMPTY_PLUS_STATS,
  normalizeClaim,
  normalizeClubBox,
  normalizeDrop,
  normalizePlusPlans,
  type AdminDropRow,
  type ClubBox,
  type DropClaim,
  type PlusDrop,
  type PlusPlan,
  type PlusStats,
  type PlusSubscription,
} from "@/lib/plus-fields";

/**
 * §24–§26 — escrita administrativa do Cliffhanger+: planos (`site/plus`),
 * Drops (`drops` + `dropClaims`) e caixas do Clube do Leitor
 * (`clubBoxes`), além das estatísticas do programa para o painel (§17).
 *
 * Leituras do usuário continuam em `plus.ts`; aqui só o painel grava.
 * Todos os helpers são tolerantes: sem Firestore, devolvem vazio/padrão.
 */

export interface PlusBoard {
  plans: PlusPlan[];
  updatedAt?: string;
  stats: PlusStats;
}

/** Planos + última customização do painel + indicadores de assinatura (§17/§24). */
export async function getPlusBoard(): Promise<PlusBoard> {
  const plans = await getPlusPlans();
  try {
    const db = getAdminDb();
    if (!db) return { plans, stats: EMPTY_PLUS_STATS };

    const [siteSnap, subsSnap] = await Promise.all([
      db.collection("site").doc("plus").get(),
      db.collection("subscriptions").limit(1000).get(),
    ]);

    const stats: PlusStats = { ...EMPTY_PLUS_STATS, porPlano: { ...EMPTY_PLUS_STATS.porPlano } };
    for (const doc of subsSnap.docs) {
      const sub = doc.data() as Partial<PlusSubscription>;
      stats.total += 1;
      if (sub.status === "cancelado") {
        stats.cancelados += 1;
        continue;
      }
      stats.ativos += 1;
      const plan = sub.plan;
      if (plan === "essential" || plan === "gold" || plan === "premium") {
        stats.porPlano[plan] += 1;
      }
      const price = Number(sub.price);
      if (Number.isFinite(price) && price > 0) stats.mrr += price;
    }
    stats.mrr = Math.round(stats.mrr * 100) / 100;

    const updatedAt = siteSnap.exists
      ? String((siteSnap.data() as { updatedAt?: string }).updatedAt ?? "") || undefined
      : undefined;
    return { plans, ...(updatedAt ? { updatedAt } : {}), stats };
  } catch {
    return { plans, stats: EMPTY_PLUS_STATS };
  }
}

/** Grava a sobrescrita de planos do painel em `site/plus` (§24). */
export async function savePlusPlans(
  plans: PlusPlan[],
): Promise<{ plans: PlusPlan[]; updatedAt: string } | null> {
  try {
    const db = getAdminDb();
    if (!db) return null;
    const updatedAt = new Date().toISOString();
    const normalized = normalizePlusPlans(plans);
    await db.collection("site").doc("plus").set(plainDoc({ plans: normalized, updatedAt }));
    return { plans: normalized, updatedAt };
  } catch {
    return null;
  }
}

/** Drops com contagem de resgates + resgates recentes (§25). */
export async function listDropsAdmin(): Promise<{
  items: AdminDropRow[];
  claims: DropClaim[];
}> {
  try {
    const db = getAdminDb();
    if (!db) return { items: [], claims: [] };
    const [dropsSnap, claimsSnap] = await Promise.all([
      db.collection("drops").orderBy("period", "desc").limit(60).get(),
      db.collection("dropClaims").orderBy("claimedAt", "desc").limit(500).get(),
    ]);

    const claims = claimsSnap.docs
      .map((doc) => normalizeClaim(doc.id, revive(doc.data())))
      .filter((c): c is DropClaim => c !== null);
    const counts = new Map<string, number>();
    for (const claim of claims) counts.set(claim.dropId, (counts.get(claim.dropId) ?? 0) + 1);

    const items = dropsSnap.docs
      .map((doc) => normalizeDrop(doc.id, revive(doc.data())))
      .filter((d): d is PlusDrop => d !== null)
      .map((drop) => ({ ...drop, claimCount: counts.get(drop.id) ?? 0 }));
    return { items, claims };
  } catch {
    return { items: [], claims: [] };
  }
}

/** Cria/atualiza um Drop. Id imutável quando já existente (§25). */
export async function saveDrop(drop: PlusDrop): Promise<PlusDrop | null> {
  try {
    const db = getAdminDb();
    if (!db || !drop.id) return null;
    await db.collection("drops").doc(drop.id).set(plainDoc(drop));
    return drop;
  } catch {
    return null;
  }
}

/** Exclui o Drop e o histórico de resgates dele — retorna quantos saíram. */
export async function deleteDrop(id: string): Promise<number | null> {
  try {
    const db = getAdminDb();
    if (!db || !id) return null;
    const claims = await db.collection("dropClaims").where("dropId", "==", id).limit(500).get();
    const batch = db.batch();
    claims.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection("drops").doc(id));
    await batch.commit();
    return claims.size;
  } catch {
    return null;
  }
}

/** Caixas do Clube do Leitor para o painel (§26). */
export async function listClubBoxesAdmin(): Promise<ClubBox[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];
    const snap = await db.collection("clubBoxes").orderBy("month", "desc").limit(36).get();
    return snap.docs
      .map((doc) => normalizeClubBox(doc.id, revive(doc.data())))
      .filter((b): b is ClubBox => b !== null);
  } catch {
    return [];
  }
}

/** Cria/atualiza uma caixa do Clube do Leitor (§26). */
export async function saveClubBox(box: ClubBox): Promise<ClubBox | null> {
  try {
    const db = getAdminDb();
    if (!db || !box.id) return null;
    await db.collection("clubBoxes").doc(box.id).set(plainDoc(box));
    return box;
  } catch {
    return null;
  }
}

export async function deleteClubBox(id: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    if (!db || !id) return false;
    await db.collection("clubBoxes").doc(id).delete();
    return true;
  } catch {
    return false;
  }
}
