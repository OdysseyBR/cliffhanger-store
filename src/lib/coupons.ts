import type { Coupon } from "@/lib/types";

/**
 * Cupons de desconto (Documento de Correção §17 — checkout; §12 — módulo
 * Cupons do painel). Funções puras de sanitização/avaliação; a leitura no
 * Firestore fica nas rotas da API (coleção `coupons`, id = código).
 */

export function normalizeCouponCode(code: string): string {
  return (code ?? "").trim().toUpperCase();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Normaliza os dados vindos do painel; `null` quando inválidos. */
export function sanitizeCoupon(raw: unknown): Coupon | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;

  const code = normalizeCouponCode(String(input.code ?? ""));
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return null;

  const type = input.type === "fixed" ? "fixed" : input.type === "percent" ? "percent" : null;
  if (!type) return null;

  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (type === "percent" && value > 100) return null;

  const minSubtotal = input.minSubtotal == null || input.minSubtotal === "" ? 0 : Number(input.minSubtotal);
  if (!Number.isFinite(minSubtotal) || minSubtotal < 0) return null;

  const maxUsesRaw = input.maxUses;
  const maxUses =
    maxUsesRaw == null || maxUsesRaw === "" ? null : Math.max(1, Math.floor(Number(maxUsesRaw)));
  if (maxUsesRaw != null && maxUsesRaw !== "" && !Number.isFinite(Number(maxUsesRaw))) return null;

  const asIsoOrNull = (value: unknown): string | null => {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const now = new Date().toISOString();
  const existing = typeof input.createdAt === "string" && input.createdAt ? input.createdAt : now;

  return {
    code,
    type,
    value: round2(value),
    minSubtotal: round2(minSubtotal),
    description: String(input.description ?? "").slice(0, 120),
    startsAt: asIsoOrNull(input.startsAt),
    endsAt: asIsoOrNull(input.endsAt),
    maxUses,
    usedCount: Number.isFinite(Number(input.usedCount)) ? Math.max(0, Math.floor(Number(input.usedCount))) : 0,
    active: input.active !== false,
    createdAt: existing,
    updatedAt: now,
  };
}

export interface CouponEvaluation {
  ok: boolean;
  error?: string;
  discount?: number;
}

/** Aplica as regras do cupom ao subtotal e devolve o desconto (R$). */
export function evaluateCoupon(coupon: Coupon, subtotal: number): CouponEvaluation {
  if (!coupon.active) return { ok: false, error: "Cupom desativado." };

  const now = Date.now();
  if (coupon.startsAt && now < new Date(coupon.startsAt).getTime()) {
    return { ok: false, error: "Cupom ainda não está válido." };
  }
  if (coupon.endsAt && now > new Date(coupon.endsAt).getTime()) {
    return { ok: false, error: "Cupom expirado." };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Cupom esgotado." };
  }
  if (subtotal < coupon.minSubtotal) {
    return { ok: false, error: `Cupom válido a partir de ${formatBrl(coupon.minSubtotal)}.` };
  }

  const base = Math.max(0, subtotal);
  const raw =
    coupon.type === "percent" ? (base * coupon.value) / 100 : Math.min(coupon.value, base);
  const discount = Math.min(round2(raw), base);
  if (discount <= 0) return { ok: false, error: "Cupom não gera desconto neste pedido." };
  return { ok: true, discount };
}

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
