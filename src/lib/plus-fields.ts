/**
 * §15 e §24–§26 — Cliffhanger+: tipos puros (client-safe) da assinatura,
 * dos Drops e do Clube do Leitor. Sem dependência de servidor aqui — a
 * persistência fica em `plus.ts` (server-only).
 *
 * Billing simulado (decisão do projeto): assinar/trocar/cancelar não passa
 * por gateway; o estado é gravado direto em `subscriptions/{uid}`.
 */

export type PlusPlanId = "essential" | "gold" | "premium";

export interface PlusPlan {
  id: PlusPlanId;
  name: string;
  /** preço mensal em reais */
  price: number;
  /** conceito de campanha (§24) */
  concept: string;
  perks: string[];
}

/** Planos oficiais (§24). O admin sobrescreve preços/benefícios em `site/plus`. */
export const DEFAULT_PLUS_PLANS: PlusPlan[] = [
  {
    id: "essential",
    name: "Essential",
    price: 24.99,
    concept: "Economize.",
    perks: [
      "Frete grátis",
      "4 e-books temporários por mês",
      "Acesso antecipado",
      "Descontos exclusivos",
      "Benefícios exclusivos",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    price: 44.99,
    concept: "Colecione.",
    perks: [
      "Tudo do Essential",
      "4 e-books permanentes por mês",
      "Clube do Leitor",
      "Benefícios exclusivos",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 64.99,
    concept: "Tenha acesso.",
    perks: [
      "Tudo do Gold",
      "Biblioteca completa de e-books e audiobooks enquanto assinar",
      "4 e-books permanentes por mês",
      "2 audiobooks permanentes por mês",
      "Benefícios Premium",
      "Latoy® Focus Multiverse (em breve)",
    ],
  },
];

export type PlusStatus = "ativo" | "cancelado";

/** Assinatura pessoal (Firestore `subscriptions/{uid}`). */
export interface PlusSubscription {
  uid: string;
  email?: string;
  plan: PlusPlanId;
  /** preço mensal congelado no momento da assinatura */
  price: number;
  status: PlusStatus;
  /** ISO */
  startedAt: string;
  /** ISO — próxima cobrança simulada */
  nextBillingAt: string;
  /** ISO — presente quando cancelada */
  canceledAt?: string;
  updatedAt: string;
}

export type PlusDropKind = "ebook" | "audiobook" | "obra";
export type PlusDropPermanence = "temporario" | "permanente";

/** Drop configurável (§25 — admin escreve, conta lê e resgata). */
export interface PlusDrop {
  id: string;
  title: string;
  description: string;
  image?: string;
  kind: PlusDropKind;
  /** produto digital liberado no resgate (ebook/audiobook) */
  productId?: string;
  /** obra associada (quando kind = "obra") */
  workId?: string;
  /** plano mínimo elegível (§25 — "plano") */
  minPlan: PlusPlanId;
  /** período do Drop: mês "AAAA-MM" (§15 — progresso semanal) */
  period: string;
  /** semana dentro do período: 1–4 */
  week: number;
  /** benefício temporário ou conteúdo permanente (§25) */
  permanence: PlusDropPermanence;
  /** disponibilidade (ISO) */
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Quem resgatou cada Drop (§25 — "registrar quais usuários resgataram"). */
export interface DropClaim {
  id: string;
  dropId: string;
  uid: string;
  email?: string;
  permanence: PlusDropPermanence;
  productId?: string;
  period: string;
  week: number;
  claimedAt: string;
}

/** Caixa mensal do Clube do Leitor (§26). */
export interface ClubBox {
  id: string;
  /** mês de referência "AAAA-MM" */
  month: string;
  title: string;
  description: string;
  image?: string;
  productIds: string[];
  /** regras de elegibilidade (§26) */
  eligibility: PlusPlanId[];
  status: "planejada" | "em_preparo" | "enviada";
  createdAt: string;
  updatedAt: string;
}

const PLAN_IDS: PlusPlanId[] = ["essential", "gold", "premium"];

export function isPlusPlanId(value: unknown): value is PlusPlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

/** Rank do plano (essential 1 < gold 2 < premium 3) para checagem de acesso. */
export function planRank(plan: PlusPlanId): number {
  return PLAN_IDS.indexOf(plan) + 1;
}

export function isPlanAtLeast(plan: PlusPlanId, minPlan: PlusPlanId): boolean {
  return planRank(plan) >= planRank(minPlan);
}

function str(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function iso(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Normaliza a lista de planos vinda do admin (`site/plus`), com fallback nos padrões. */
export function normalizePlusPlans(raw: unknown): PlusPlan[] {
  const rows = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, Partial<PlusPlan>>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<PlusPlan>;
    if (item && isPlusPlanId(item.id)) byId.set(item.id, item);
  }
  return DEFAULT_PLUS_PLANS.map((base) => {
    const over = byId.get(base.id);
    const price = Number(over?.price);
    const concept = str(over?.concept, 60);
    const perks = Array.isArray(over?.perks)
      ? over.perks
          .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
          .map((p) => p.trim().slice(0, 120))
          .slice(0, 8)
      : [];
    return {
      ...base,
      price:
        Number.isFinite(price) && price >= 0 && price <= 1000
          ? Math.round(price * 100) / 100
          : base.price,
      concept: concept || base.concept,
      perks: perks.length > 0 ? perks : base.perks,
    };
  });
}

export function normalizeSubscription(
  uid: string,
  raw: unknown,
): PlusSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<PlusSubscription>;
  const plan = isPlusPlanId(data.plan) ? data.plan : null;
  if (!plan) return null;
  const price = Number(data.price);
  const status: PlusStatus = data.status === "cancelado" ? "cancelado" : "ativo";
  const startedAt = iso(data.startedAt) || new Date().toISOString();
  return {
    uid,
    email: str(data.email, 160) || undefined,
    plan,
    price:
      Number.isFinite(price) && price >= 0
        ? Math.round(price * 100) / 100
        : DEFAULT_PLUS_PLANS.find((p) => p.id === plan)?.price ?? 0,
    status,
    startedAt,
    nextBillingAt: iso(data.nextBillingAt) || startedAt,
    canceledAt: iso(data.canceledAt) || undefined,
    updatedAt: iso(data.updatedAt) || startedAt,
  };
}

export function normalizeDrop(id: string, raw: unknown): PlusDrop | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<PlusDrop>;
  const title = str(data.title, 140);
  if (!title) return null;
  const week = Math.min(4, Math.max(1, Math.round(Number(data.week)) || 1));
  return {
    id,
    title,
    description: str(data.description, 400),
    image: str(data.image, 400) || undefined,
    kind:
      data.kind === "audiobook" || data.kind === "obra" ? data.kind : "ebook",
    productId: str(data.productId, 120) || undefined,
    workId: str(data.workId, 120) || undefined,
    minPlan: isPlusPlanId(data.minPlan) ? data.minPlan : "essential",
    period: /^\d{4}-\d{2}$/.test(str(data.period, 10)) ? str(data.period, 10) : currentPeriod(),
    week,
    permanence: data.permanence === "permanente" ? "permanente" : "temporario",
    startsAt: iso(data.startsAt),
    endsAt: iso(data.endsAt),
    active: data.active !== false,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

export function normalizeClaim(id: string, raw: unknown): DropClaim | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<DropClaim>;
  const dropId = str(data.dropId, 140);
  const uid = str(data.uid, 128);
  if (!dropId || !uid) return null;
  return {
    id,
    dropId,
    uid,
    email: str(data.email, 160) || undefined,
    permanence: data.permanence === "permanente" ? "permanente" : "temporario",
    productId: str(data.productId, 120) || undefined,
    period: /^\d{4}-\d{2}$/.test(str(data.period, 10)) ? str(data.period, 10) : currentPeriod(),
    week: Math.min(4, Math.max(1, Math.round(Number(data.week)) || 1)),
    claimedAt: iso(data.claimedAt) || new Date().toISOString(),
  };
}

export function normalizeClubBox(id: string, raw: unknown): ClubBox | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<ClubBox>;
  const title = str(data.title, 140);
  const month = str(data.month, 10);
  if (!title || !/^\d{4}-\d{2}$/.test(month)) return null;
  const eligibility = Array.isArray(data.eligibility)
    ? data.eligibility.filter(isPlusPlanId)
    : [];
  return {
    id,
    month,
    title,
    description: str(data.description, 400),
    image: str(data.image, 400) || undefined,
    productIds: Array.isArray(data.productIds)
      ? data.productIds
          .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
          .map((p) => p.trim())
          .slice(0, 30)
      : [],
    eligibility: eligibility.length > 0 ? eligibility : ["gold", "premium"],
    status:
      data.status === "enviada" || data.status === "em_preparo"
        ? data.status
        : "planejada",
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

/** Mês corrente no fuso da loja (America/Sao_Paulo) — "AAAA-MM". */
export function currentPeriod(now: Date = new Date()): string {
  try {
    // "sv-SE" produz o padrão ISO (AAAA-MM-DD) já no fuso pedido.
    return now
      .toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
      .slice(0, 7);
  } catch {
    return now.toISOString().slice(0, 7);
  }
}

// ---------------------------------------------------------------------------
// Estado pronto para a UI (§15) — puro, para ser importado pelo client
// ---------------------------------------------------------------------------

export interface PlusDropView extends PlusDrop {
  claimed: boolean;
  claimable: boolean;
  /** motivo do bloqueio quando `claimable` é false */
  blocked?: "assinatura" | "plano" | "janela" | "inativo" | "resgatado";
}

export interface PlusWeekProgress {
  week: number;
  claimed: boolean;
}

export interface PlusState {
  active: boolean;
  plans: PlusPlan[];
  subscription: PlusSubscription | null;
  drops: PlusDropView[];
  /** período corrente "AAAA-MM" do progresso semanal */
  period: string;
  progress: PlusWeekProgress[];
  club: { eligible: boolean; boxes: ClubBox[] };
}

/** Semana 1–4 do mês (§15 — "Semana 1 … Semana 4"). */
export function currentWeek(now: Date = new Date()): number {
  let day = now.getUTCDate();
  try {
    const isoDay = now.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    day = Number(isoDay.slice(8, 10)) || day;
  } catch {
    /* usa o dia UTC */
  }
  return Math.min(4, Math.max(1, Math.ceil(day / 7)));
}
