import type {
  ClubBenefit,
  ClubTier,
  Promotion,
  PromotionPhase,
  Review,
  StoreNotification,
} from "@/lib/types";

/**
 * §12/§16/§18/§19 — regras dos módulos de Marketing do painel.
 *
 * - Promoções: campanhas que combinam produtos, coleção, cupom, banner e
 *   período (§16). O desconto continua sendo o do cupom/`compareAt`; aqui
 *   se organiza e agenda a campanha.
 * - Club: pontos e benefícios do Cliffhanger Club (§18).
 * - Avaliações: moderação de estrelas/comentários/fotos com compra
 *   verificada (§19).
 * - Notificações: comunicados por canal, público e status (§16).
 */

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoOrNull(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

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

export type FieldParse<T> = { ok: true; item: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Promoções (§16)
// ---------------------------------------------------------------------------

export interface PromotionForm {
  title: string;
  description: string;
  productIds: string[];
  collectionId: string;
  couponCode: string;
  bannerId: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export const BLANK_PROMOTION_FORM: PromotionForm = {
  title: "",
  description: "",
  productIds: [],
  collectionId: "",
  couponCode: "",
  bannerId: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

export function toPromotionForm(promotion: Promotion): PromotionForm {
  return {
    title: promotion.title,
    description: promotion.description,
    productIds: [...promotion.productIds],
    collectionId: promotion.collectionId ?? "",
    couponCode: promotion.couponCode ?? "",
    bannerId: promotion.bannerId ?? "",
    startsAt: promotion.startsAt ? promotion.startsAt.slice(0, 16) : "",
    endsAt: promotion.endsAt ? promotion.endsAt.slice(0, 16) : "",
    active: promotion.active,
  };
}

/** Fase da campanha a partir da janela e da flag (agora = horário real). */
export function promotionPhase(promotion: Promotion, now = Date.now()): PromotionPhase {
  if (!promotion.active) return "inativa";
  const start = promotion.startsAt ? Date.parse(promotion.startsAt) : null;
  const end = promotion.endsAt ? Date.parse(promotion.endsAt) : null;
  if (start !== null && now < start) return "agendada";
  if (end !== null && now > end) return "expirada";
  return "ativa";
}

export function sanitizePromotionInput(raw: unknown, existing: Promotion | null): FieldParse<Promotion> {
  const input = (raw ?? null) as Partial<PromotionForm> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados da promoção inválidos." };
  }

  const title = str(input.title);
  if (!title) return { ok: false, error: "A promoção precisa de um título." };

  const productIds = Array.isArray(input.productIds)
    ? [...new Set(input.productIds.filter((id): id is string => typeof id === "string" && id.trim() !== ""))]
    : [];
  if (productIds.length === 0) {
    return { ok: false, error: "Selecione ao menos um produto da campanha." };
  }
  if (productIds.length > 60) {
    return { ok: false, error: "A campanha aceita no máximo 60 produtos." };
  }

  const startsAt = isoOrNull(input.startsAt);
  const endsAt = isoOrNull(input.endsAt);
  if (input.startsAt && !startsAt) return { ok: false, error: "Início inválido." };
  if (input.endsAt && !endsAt) return { ok: false, error: "Término inválido." };
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { ok: false, error: "O término precisa ser depois do início." };
  }

  const now = new Date().toISOString();
  const id = existing?.id ?? `promo-${slugify(title) || "campanha"}-${Date.now().toString(36)}`;

  return {
    ok: true,
    item: {
      id,
      title,
      description: str(input.description),
      productIds,
      collectionId: str(input.collectionId) || undefined,
      couponCode: str(input.couponCode) || undefined,
      bannerId: str(input.bannerId) || undefined,
      startsAt,
      endsAt,
      active: input.active !== false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Club (§18)
// ---------------------------------------------------------------------------

export const CLUB_TIERS: Array<{ tier: ClubTier; min: number }> = [
  { tier: "Lenda", min: 500 },
  { tier: "Maré", min: 100 },
  { tier: "Farol", min: 0 },
];

/** Nível a partir dos pontos (derivado — nunca gravado). */
export function clubTier(points: number): ClubTier {
  return CLUB_TIERS.find((entry) => points >= entry.min)?.tier ?? "Farol";
}

export interface BenefitForm {
  title: string;
  description: string;
  cost: number;
  kind: ClubBenefit["kind"];
  couponCode: string;
  active: boolean;
}

export const BLANK_BENEFIT_FORM: BenefitForm = {
  title: "",
  description: "",
  cost: 100,
  kind: "cupom",
  couponCode: "",
  active: true,
};

export function toBenefitForm(benefit: ClubBenefit): BenefitForm {
  return {
    title: benefit.title,
    description: benefit.description,
    cost: benefit.cost,
    kind: benefit.kind,
    couponCode: benefit.couponCode ?? "",
    active: benefit.active,
  };
}

const BENEFIT_KINDS: Array<ClubBenefit["kind"]> = ["cupom", "frete", "produto", "conteudo"];

export function sanitizeBenefitInput(raw: unknown, existing: ClubBenefit | null): FieldParse<ClubBenefit> {
  const input = (raw ?? null) as Partial<BenefitForm> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados do benefício inválidos." };
  }

  const title = str(input.title);
  if (!title) return { ok: false, error: "O benefício precisa de um título." };

  const cost = num(input.cost);
  if (cost === null || !Number.isInteger(cost) || cost < 1 || cost > 100000) {
    return { ok: false, error: "O custo precisa ser de 1 a 100000 pontos." };
  }

  if (!BENEFIT_KINDS.includes(input.kind as ClubBenefit["kind"])) {
    return { ok: false, error: "Tipo de benefício inválido." };
  }

  const couponCode = str(input.couponCode);
  if (input.kind === "cupom" && !couponCode) {
    return { ok: false, error: "Benefício do tipo cupom precisa do código entregue no resgate." };
  }

  const now = new Date().toISOString();
  const id = existing?.id ?? `benefit-${slugify(title) || "beneficio"}-${Date.now().toString(36)}`;

  return {
    ok: true,
    item: {
      id,
      title,
      description: str(input.description),
      cost,
      kind: input.kind as ClubBenefit["kind"],
      couponCode: input.kind === "cupom" ? couponCode : undefined,
      active: input.active !== false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}

export interface PointsAdjust {
  delta: number;
  reason: string;
}

export function sanitizePointsAdjust(raw: unknown): FieldParse<PointsAdjust> {
  const input = (raw ?? null) as { delta?: unknown; reason?: unknown } | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados do ajuste inválidos." };
  }
  const delta = num(input.delta);
  if (delta === null || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
    return { ok: false, error: "O ajuste precisa ser um número inteiro diferente de zero (até 100000)." };
  }
  const reason = str(input.reason);
  if (reason.length < 3) {
    return { ok: false, error: "Informe o motivo do ajuste (mín. 3 letras) — ele vai para a auditoria." };
  }
  return { ok: true, item: { delta, reason } };
}

// ---------------------------------------------------------------------------
// Avaliações (§19)
// ---------------------------------------------------------------------------

export type ReviewStatus = Review["status"];

export function sanitizeReviewInput(raw: unknown): FieldParse<{
  productId: string;
  authorName: string;
  email: string;
  rating: number;
  comment: string;
  photos: string[];
}> {
  const input = (raw ?? null) as Partial<Review> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados da avaliação inválidos." };
  }

  const productId = str(input.productId);
  if (!productId) return { ok: false, error: "Avaliação sem produto." };

  const authorName = str(input.authorName);
  if (!authorName) return { ok: false, error: "Informe seu nome na avaliação." };

  const rating = num(input.rating);
  if (rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "A nota vai de 1 a 5 estrelas." };
  }

  const comment = str(input.comment);
  if (comment.length < 3 || comment.length > 2000) {
    return { ok: false, error: "O comentário precisa de 3 a 2000 caracteres." };
  }

  const photos = Array.isArray(input.photos) ? input.photos : [];
  if (photos.length > 3) return { ok: false, error: "A avaliação aceita no máximo 3 fotos." };
  for (const photo of photos) {
    if (typeof photo !== "string" || !isHttpUrl(photo.trim())) {
      return { ok: false, error: "Cada foto precisa ser uma URL https válida." };
    }
  }

  const email = str(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }

  return {
    ok: true,
    item: {
      productId,
      authorName,
      email,
      rating,
      comment,
      photos: photos.map((photo) => photo.trim()),
    },
  };
}

// ---------------------------------------------------------------------------
// Notificações (§16)
// ---------------------------------------------------------------------------

const CHANNELS = ["email", "in_app", "push"] as const;
export type NotifyChannel = (typeof CHANNELS)[number];

export interface NotificationForm {
  title: string;
  body: string;
  channels: NotifyChannel[];
  targetAudience: "all" | "club";
  status: StoreNotification["status"];
  scheduledAt: string;
}

export const BLANK_NOTIFICATION_FORM: NotificationForm = {
  title: "",
  body: "",
  channels: ["in_app"],
  targetAudience: "all",
  status: "draft",
  scheduledAt: "",
};

export function toNotificationForm(item: StoreNotification): NotificationForm {
  return {
    title: item.title,
    body: item.body,
    channels: [...item.channels],
    targetAudience: item.targetAudience,
    status: item.status,
    scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : "",
  };
}

const NOTIFY_STATUS: Array<StoreNotification["status"]> = ["draft", "scheduled", "sent"];

/** Transições honestas: rascunho pode agendar/enviar; agendada pode enviar; enviada é final. */
export function canTransitionNotification(
  from: StoreNotification["status"],
  to: StoreNotification["status"],
): boolean {
  if (from === to) return true;
  if (from === "draft") return to === "scheduled" || to === "sent";
  if (from === "scheduled") return to === "sent" || to === "draft";
  return false;
}

export function sanitizeNotificationInput(
  raw: unknown,
  existing: StoreNotification | null,
): FieldParse<StoreNotification> {
  const input = (raw ?? null) as Partial<NotificationForm> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados da notificação inválidos." };
  }

  const title = str(input.title);
  if (!title) return { ok: false, error: "A notificação precisa de um título." };

  const body = str(input.body);
  if (body.length < 3 || body.length > 2000) {
    return { ok: false, error: "O texto precisa de 3 a 2000 caracteres." };
  }

  const channels = Array.isArray(input.channels)
    ? [...new Set(input.channels.filter((c): c is NotifyChannel => CHANNELS.includes(c as NotifyChannel)))]
    : [];
  if (channels.length === 0) {
    return { ok: false, error: "Escolha ao menos um canal (e-mail, app ou push)." };
  }

  if (input.targetAudience !== "all" && input.targetAudience !== "club") {
    return { ok: false, error: "Público-alvo inválido." };
  }

  const status = NOTIFY_STATUS.includes(input.status as StoreNotification["status"])
    ? (input.status as StoreNotification["status"])
    : "draft";

  if (existing && !canTransitionNotification(existing.status, status)) {
    return { ok: false, error: "Notificação enviada não pode voltar a rascunho." };
  }

  const scheduledAt = isoOrNull(input.scheduledAt);
  if (input.scheduledAt && !scheduledAt) {
    return { ok: false, error: "Data de agendamento inválida." };
  }
  if (status === "scheduled" && !scheduledAt) {
    return { ok: false, error: "Notificação agendada precisa de data e hora." };
  }
  if (status === "scheduled" && scheduledAt && Date.parse(scheduledAt) <= Date.now()) {
    return { ok: false, error: "O agendamento precisa ser no futuro." };
  }

  const now = new Date().toISOString();
  return {
    ok: true,
    item: {
      id: existing?.id ?? `notif-${Date.now().toString(36)}`,
      title,
      body,
      channels,
      targetAudience: input.targetAudience,
      status,
      scheduledAt: status === "scheduled" ? scheduledAt : (existing?.scheduledAt ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}
