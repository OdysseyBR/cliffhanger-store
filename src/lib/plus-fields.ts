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

// ---------------------------------------------------------------------------
// Painel (§24–§26) — estatísticas, formulários e sanitização
// ---------------------------------------------------------------------------

export type PlusFieldParse<T> = { ok: true; item: T } | { ok: false; error: string };

/** Indicadores do programa para o painel (§17/§24). */
export interface PlusStats {
  /** assinaturas já criadas (ativas + canceladas) */
  total: number;
  ativos: number;
  cancelados: number;
  /** assinaturas ativas por plano */
  porPlano: Record<PlusPlanId, number>;
  /** receita mensal simulada dos ativos */
  mrr: number;
}

export const EMPTY_PLUS_STATS: PlusStats = {
  total: 0,
  ativos: 0,
  cancelados: 0,
  porPlano: { essential: 0, gold: 0, premium: 0 },
  mrr: 0,
};

/** Linha do painel: Drop + contagem de resgates (§25). */
export type AdminDropRow = PlusDrop & { claimCount: number };

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** ISO → valor de `input[type="datetime-local"]` (fuso local). */
export function toLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `input[type="datetime-local"]` → ISO (vazio mantém vazio). */
function fromLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

// -- Drops (§25) ------------------------------------------------------------

export interface DropForm {
  title: string;
  description: string;
  image: string;
  kind: PlusDropKind;
  productId: string;
  workId: string;
  minPlan: PlusPlanId;
  period: string;
  week: number;
  permanence: PlusDropPermanence;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export function blankDropForm(): DropForm {
  return {
    title: "",
    description: "",
    image: "",
    kind: "ebook",
    productId: "",
    workId: "",
    minPlan: "essential",
    period: currentPeriod(),
    week: currentWeek(),
    permanence: "temporario",
    startsAt: "",
    endsAt: "",
    active: true,
  };
}

export function toDropForm(drop: PlusDrop): DropForm {
  return {
    title: drop.title,
    description: drop.description,
    image: drop.image ?? "",
    kind: drop.kind,
    productId: drop.productId ?? "",
    workId: drop.workId ?? "",
    minPlan: drop.minPlan,
    period: drop.period,
    week: drop.week,
    permanence: drop.permanence,
    startsAt: toLocalInput(drop.startsAt),
    endsAt: toLocalInput(drop.endsAt),
    active: drop.active,
  };
}

export function sanitizeDropInput(
  raw: unknown,
  existing?: { id: string; createdAt?: string } | null,
): PlusFieldParse<PlusDrop> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Dados do Drop inválidos." };
  }
  const incomingId = typeof (raw as { id?: unknown }).id === "string"
    ? (raw as { id: string }).id.trim()
    : "";
  if (incomingId && existing?.id && incomingId !== existing.id) {
    return { ok: false, error: "O id do Drop não pode ser alterado." };
  }
  const form = raw as Partial<DropForm>;
  const title = String(form.title ?? "").trim().slice(0, 140);
  if (!title) return { ok: false, error: "Informe o título do Drop." };

  const kind: PlusDropKind =
    form.kind === "audiobook" || form.kind === "obra" ? form.kind : "ebook";
  const productId = String(form.productId ?? "").trim().slice(0, 120);
  const workId = String(form.workId ?? "").trim().slice(0, 120);
  if (kind === "obra" && !workId) {
    return { ok: false, error: "Selecione a obra associada ao Drop." };
  }
  if (kind !== "obra" && !productId) {
    return { ok: false, error: "Selecione o conteúdo digital liberado no Drop." };
  }

  const period = String(form.period ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return { ok: false, error: "Período inválido — use AAAA-MM." };
  }
  const week = Math.min(4, Math.max(1, Math.round(Number(form.week)) || 1));
  const image = String(form.image ?? "").trim().slice(0, 400);
  if (image && !isHttpUrl(image)) {
    return { ok: false, error: "A imagem precisa ser uma URL http(s)." };
  }

  const startsAt = fromLocalInput(String(form.startsAt ?? ""));
  const endsAt = fromLocalInput(String(form.endsAt ?? ""));
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: "O fim da disponibilidade precisa ser depois do início." };
  }

  const now = new Date().toISOString();
  const id = existing?.id ?? `drop-${slugify(title) || "conteudo"}-${Date.now().toString(36)}`;
  return {
    ok: true,
    item: {
      id,
      title,
      description: String(form.description ?? "").trim().slice(0, 400),
      image: image || undefined,
      kind,
      productId: kind !== "obra" ? productId : undefined,
      workId: kind === "obra" ? workId : undefined,
      minPlan: isPlusPlanId(form.minPlan) ? form.minPlan : "essential",
      period,
      week,
      permanence: form.permanence === "permanente" ? "permanente" : "temporario",
      startsAt,
      endsAt,
      active: form.active !== false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
  };
}

// -- Clube do Leitor (§26) --------------------------------------------------

export interface ClubBoxForm {
  month: string;
  title: string;
  description: string;
  image: string;
  productIds: string[];
  eligibility: PlusPlanId[];
  status: "planejada" | "em_preparo" | "enviada";
}

export function blankClubBoxForm(): ClubBoxForm {
  return {
    month: currentPeriod(),
    title: "",
    description: "",
    image: "",
    productIds: [],
    eligibility: ["gold", "premium"],
    status: "planejada",
  };
}

export function toClubBoxForm(box: ClubBox): ClubBoxForm {
  return {
    month: box.month,
    title: box.title,
    description: box.description,
    image: box.image ?? "",
    productIds: [...box.productIds],
    eligibility: [...box.eligibility],
    status: box.status,
  };
}

export function sanitizeClubBoxInput(
  raw: unknown,
  existing?: { id: string; createdAt?: string } | null,
): PlusFieldParse<ClubBox> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Dados da caixa inválidos." };
  }
  const incomingId = typeof (raw as { id?: unknown }).id === "string"
    ? (raw as { id: string }).id.trim()
    : "";
  if (incomingId && existing?.id && incomingId !== existing.id) {
    return { ok: false, error: "O id da caixa não pode ser alterado." };
  }
  const form = raw as Partial<ClubBoxForm>;
  const month = String(form.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, error: "Mês de referência inválido — use AAAA-MM." };
  }
  const title = String(form.title ?? "").trim().slice(0, 140);
  if (!title) return { ok: false, error: "Informe o título da caixa." };

  const image = String(form.image ?? "").trim().slice(0, 400);
  if (image && !isHttpUrl(image)) {
    return { ok: false, error: "A imagem precisa ser uma URL http(s)." };
  }
  const eligibility = (Array.isArray(form.eligibility) ? form.eligibility : []).filter(
    isPlusPlanId,
  );
  if (eligibility.length === 0) {
    return { ok: false, error: "Marque ao menos um plano elegível." };
  }
  const productIds = (Array.isArray(form.productIds) ? form.productIds : [])
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim())
    .slice(0, 30);

  const now = new Date().toISOString();
  const id = existing?.id ?? `box-${month}-${Date.now().toString(36)}`;
  return {
    ok: true,
    item: {
      id,
      month,
      title,
      description: String(form.description ?? "").trim().slice(0, 400),
      image: image || undefined,
      productIds,
      eligibility,
      status:
        form.status === "em_preparo" || form.status === "enviada" ? form.status : "planejada",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
  };
}

// -- Planos (§24) -----------------------------------------------------------

/** Aceita o objeto `{ plans }` gravado em `site/plus` e normaliza com fallback nos padrões. */
export function sanitizePlusPlansInput(raw: unknown): PlusFieldParse<PlusPlan[]> {
  const source =
    raw && typeof raw === "object" && "plans" in (raw as Record<string, unknown>)
      ? (raw as { plans?: unknown }).plans
      : raw;
  if (!Array.isArray(source) || source.length !== DEFAULT_PLUS_PLANS.length) {
    return { ok: false, error: "Os três planos do Cliffhanger+ são obrigatórios." };
  }
  const ids = new Set<string>();
  for (const row of source) {
    if (!row || typeof row !== "object" || !isPlusPlanId((row as Partial<PlusPlan>).id)) {
      return { ok: false, error: "Plano inválido — use Essential, Gold e Premium." };
    }
    const id = (row as PlusPlan).id;
    if (ids.has(id)) return { ok: false, error: "Plano duplicado na lista." };
    ids.add(id);
  }
  const plans = normalizePlusPlans(source);
  if (plans.length !== DEFAULT_PLUS_PLANS.length) {
    return { ok: false, error: "Os três planos do Cliffhanger+ são obrigatórios." };
  }
  return { ok: true, item: plans };
}
