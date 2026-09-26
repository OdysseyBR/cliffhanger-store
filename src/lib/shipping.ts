/**
 * Cálculo de frete (Documento de Correção §17) — cotação por CEP com
 * tabela regional própria. A região é resolvida pela faixa do CEP, o preço
 * combina a base regional + item adicional, e o frete grátis de R$ 199 é
 * aplicado na cotação. Módulo puro (sem rede) — usado pelo checkout e
 * revalidado no servidor do pedido: o valor enviado pelo cliente nunca é
 * confiado.
 */

export const FREE_SHIPPING_FROM = 199;
export const ADDITIONAL_ITEM_FEE = 6;

export type ShippingOptionId = "standard" | "express";
export type ShippingRegion =
  | "sudeste"
  | "sul"
  | "centro-oeste"
  | "nordeste"
  | "norte";

interface RegionPlan {
  label: string;
  standard: { price: number; daysMin: number; daysMax: number };
  express: { price: number; daysMin: number; daysMax: number };
}

const REGIONS: Record<ShippingRegion, RegionPlan> = {
  sudeste: {
    label: "Sudeste",
    standard: { price: 19.9, daysMin: 5, daysMax: 8 },
    express: { price: 34.9, daysMin: 2, daysMax: 3 },
  },
  sul: {
    label: "Sul",
    standard: { price: 24.9, daysMin: 6, daysMax: 10 },
    express: { price: 42.9, daysMin: 3, daysMax: 4 },
  },
  "centro-oeste": {
    label: "Centro-Oeste",
    standard: { price: 26.9, daysMin: 7, daysMax: 11 },
    express: { price: 46.9, daysMin: 4, daysMax: 5 },
  },
  nordeste: {
    label: "Nordeste",
    standard: { price: 29.9, daysMin: 8, daysMax: 13 },
    express: { price: 52.9, daysMin: 5, daysMax: 7 },
  },
  norte: {
    label: "Norte",
    standard: { price: 34.9, daysMin: 10, daysMax: 16 },
    express: { price: 59.9, daysMin: 6, daysMax: 9 },
  },
};

/** faixas pelos 5 primeiros dígitos do CEP (01310-100 → 1310) */
const CEP_RANGES: [number, number, ShippingRegion][] = [
  [1000, 39999, "sudeste"], // SP, RJ, MG, ES
  [40000, 65999, "nordeste"], // BA, SE, PE, AL, PB, RN, CE, PI, MA
  [66000, 69999, "norte"], // PA, AM, RR, AC
  [70000, 76799, "centro-oeste"], // DF, GO
  [76800, 76999, "norte"], // RO
  [77000, 77999, "norte"], // TO
  [78000, 79999, "centro-oeste"], // MT, MS
  [80000, 99999, "sul"], // PR, SC, RS
];

export function cepDigits(cep: string): string {
  return (cep ?? "").replace(/\D/g, "");
}

export function formatCep(cep: string): string {
  const digits = cepDigits(cep);
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** região pelo CEP; `null` quando o CEP é inválido */
export function regionFromCep(cep: string): ShippingRegion | null {
  const digits = cepDigits(cep);
  if (digits.length !== 8) return null;
  const prefix = Number(digits.slice(0, 5));
  if (!Number.isFinite(prefix) || prefix < 1000) return null;
  const hit = CEP_RANGES.find(([min, max]) => prefix >= min && prefix <= max);
  return hit ? hit[2] : null;
}

export interface ShippingOptionQuote {
  id: ShippingOptionId;
  label: string;
  price: number;
  free: boolean;
  daysMin: number;
  daysMax: number;
}

export interface ShippingQuote {
  cep: string;
  region: ShippingRegion;
  regionLabel: string;
  /** UF resolvida via ViaCEP quando acessível (exibição) */
  state?: string | null;
  options: ShippingOptionQuote[];
}

interface QuoteInput {
  cep: string;
  /** quantidade total de itens físicos (1–99) */
  itemCount: number;
  /** subtotal do pedido em R$ */
  subtotal: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Cotação com as duas modalidades. Retorna `null` para CEP inválido —
 * o chamador decide o fallback.
 */
export function quoteShipping({ cep, itemCount, subtotal }: QuoteInput): ShippingQuote | null {
  const region = regionFromCep(cep);
  if (!region) return null;
  const plan = REGIONS[region];
  const qty = Math.max(1, Math.min(99, Math.floor(itemCount) || 1));
  const extra = (qty - 1) * ADDITIONAL_ITEM_FEE;
  const free = subtotal >= FREE_SHIPPING_FROM;

  const build = (
    id: ShippingOptionId,
    label: string,
    base: RegionPlan["standard"],
  ): ShippingOptionQuote => ({
    id,
    label: `${label} · ${base.daysMin} a ${base.daysMax} dias úteis`,
    price: free ? 0 : round2(base.price + extra),
    free,
    daysMin: base.daysMin,
    daysMax: base.daysMax,
  });

  return {
    cep: formatCep(cep),
    region,
    regionLabel: plan.label,
    options: [build("standard", "Padrão", plan.standard), build("express", "Expressa", plan.express)],
  };
}

/** preço de um pedido físico sem cotação (fallback determinístico) */
export function fallbackShippingPrice(subtotal: number, option: ShippingOptionId): number {
  if (subtotal >= FREE_SHIPPING_FROM) return 0;
  return option === "express" ? 39.9 : 24.9;
}
