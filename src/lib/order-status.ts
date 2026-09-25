import type { OrderStatus } from "@/lib/types";

/**
 * Status de pedido compartilhados entre o Dashboard (Documento de Correção
 * §12), o módulo Pedidos e a página do cliente `/pedidos` (§17 e §22).
 */

/** Status em inglês vindos de pedidos antigos (demo) → enum do documento. */
const LEGACY_STATUS: Record<string, OrderStatus> = {
  pending: "aguardando_pagamento",
  paid: "pagamento_aprovado",
  processing: "em_separacao",
  shipped: "enviado",
  delivered: "entregue",
  cancelled: "cancelado",
  canceled: "cancelado",
};

const KNOWN_STATUS: OrderStatus[] = [
  "aguardando_pagamento",
  "pagamento_aprovado",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
];

/** Normaliza o valor gravado (inclusive legados) para o enum oficial. */
export function normalizeStatus(value: unknown): OrderStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (KNOWN_STATUS.includes(raw as OrderStatus)) return raw as OrderStatus;
  return LEGACY_STATUS[raw.toLowerCase()] ?? (raw as OrderStatus);
}

/** Rótulo amigável de cada status. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_aprovado: "Pagamento aprovado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** Cor do rótulo sobre os cards escuros do painel e de `/pedidos`. */
export function orderStatusClass(status: OrderStatus): string {
  if (status === "cancelado") return "text-[var(--text-muted)]";
  if (status === "aguardando_pagamento") return "text-orange-300";
  if (status === "entregue" || status === "enviado") return "text-emerald-300";
  return "text-violet-soft";
}
