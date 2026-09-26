import type { StockKind, StockMovement } from "@/lib/types";

/**
 * §14 — regras de estoque do painel: entradas, saídas, ajustes, reservados,
 * mínimo e motivo obrigatório. Módulo puro (client + server): o formulário
 * valida com as mesmas funções que a API de escrita executa.
 *
 * Disponível = estoque − reservado (a loja nunca vende unidade reservada de
 * pré-venda/pedido em separação).
 */

export const STOCK_KINDS = ["entrada", "saida", "ajuste"] as const;

export const STOCK_KIND_LABELS: Record<StockKind, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};

/** Rótulos dos campos para as mensagens de validação. */
const FIELD_LABELS: Record<string, string> = {
  minStock: "Estoque mínimo",
  reserved: "Reservados",
};

export interface StockState {
  stock: number;
  reserved: number;
  minStock: number;
}

/** Item da listagem do módulo Estoque (com os saldos derivados). */
export interface AdminStockItem {
  id: string;
  title: string;
  slug: string;
  stock: number;
  reserved: number;
  available: number;
  minStock: number;
  digital: boolean;
  badge?: string;
  low: boolean;
  soldOut: boolean;
}

export interface StockAdjustInput {
  kind: StockKind;
  /** entradas/saídas: unidades movimentadas; ajuste: valor absoluto */
  qty: number;
  reason: string;
  /** null = manter o valor atual do campo */
  minStock: number | null;
  reserved: number | null;
}

export type ParseResult =
  | { ok: true; input: StockAdjustInput }
  | { ok: false; error: string };

export type ApplyResult =
  | { ok: true; next: StockState }
  | { ok: false; error: string };

/** Unidades livres para venda (§14 — disponível). */
export function availableOf(stock: number, reserved: number): number {
  return Math.max(0, stock) - Math.max(0, reserved);
}

/** Alerta de estoque baixo: só quando o mínimo está configurado (> 0). */
export function isLowStock(stock: number, minStock: number | undefined): boolean {
  const min = Number(minStock ?? 0);
  return min > 0 && Math.max(0, stock) <= min;
}

function readOptionalInt(
  body: Record<string, unknown>,
  key: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const raw = body[key];
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    return {
      ok: false,
      error: `${FIELD_LABELS[key] ?? key} precisa ser um número inteiro maior ou igual a zero.`,
    };
  }
  return { ok: true, value };
}

/** Valida o corpo enviado pelo formulário de movimentação. */
export function parseStockAdjust(raw: unknown): ParseResult {
  const body = (raw ?? {}) as Record<string, unknown>;
  const kind = String(body.kind ?? "") as StockKind;
  if (!(STOCK_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: "Tipo de movimento inválido (entrada, saída ou ajuste)." };
  }

  const qty = Number(body.qty);
  if (!Number.isInteger(qty) || qty < 0) {
    return { ok: false, error: "Quantidade inválida — use um número inteiro." };
  }
  if (kind !== "ajuste" && qty < 1) {
    return { ok: false, error: "Informe ao menos 1 unidade para entrada ou saída." };
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) {
    return { ok: false, error: "Informe o motivo do movimento (mínimo de 3 caracteres)." };
  }
  if (reason.length > 120) {
    return { ok: false, error: "Motivo muito longo — máximo de 120 caracteres." };
  }

  const minStock = readOptionalInt(body, "minStock");
  if (!minStock.ok) return { ok: false, error: minStock.error };
  const reserved = readOptionalInt(body, "reserved");
  if (!reserved.ok) return { ok: false, error: reserved.error };

  return {
    ok: true,
    input: { kind, qty, reason, minStock: minStock.value, reserved: reserved.value },
  };
}

/**
 * Aplica o movimento sobre o estado atual. Não deixa estoque negativo nem
 * reservado acima do estoque (disponível nunca fica < 0).
 */
export function applyStockAdjust(current: StockState, input: StockAdjustInput): ApplyResult {
  const stock = Math.max(0, current.stock);
  const reserved = Math.max(0, current.reserved);

  let nextStock: number;
  if (input.kind === "entrada") {
    nextStock = stock + input.qty;
  } else if (input.kind === "saida") {
    const available = availableOf(stock, reserved);
    if (input.qty > available) {
      return {
        ok: false,
        error: `Saída de ${input.qty} un. acima do disponível (${available} un. = estoque ${stock} − reservado ${reserved}).`,
      };
    }
    nextStock = stock - input.qty;
  } else {
    // ajuste: o número é o novo estoque absoluto
    nextStock = input.qty;
  }

  const nextReserved = input.reserved ?? reserved;
  if (nextReserved > nextStock) {
    return {
      ok: false,
      error: `Reservados (${nextReserved}) não pode superar o estoque (${nextStock}).`,
    };
  }

  return {
    ok: true,
    next: {
      stock: nextStock,
      reserved: nextReserved,
      minStock: input.minStock ?? Math.max(0, current.minStock),
    },
  };
}

/** Resumo legível gravado na trilha de auditoria (§13). */
export function movementSummary(
  input: StockAdjustInput,
  before: StockState,
  after: StockState,
): string {
  const label = STOCK_KIND_LABELS[input.kind];
  const step =
    input.kind === "ajuste"
      ? `ajustou para ${after.stock} un. (${before.stock} → ${after.stock})`
      : `${label.toLowerCase()} de ${input.qty} un. (${before.stock} → ${after.stock})`;

  const extras: string[] = [];
  if (after.reserved !== before.reserved) extras.push(`reservados ${before.reserved} → ${after.reserved}`);
  if (after.minStock !== before.minStock) extras.push(`mínimo ${before.minStock} → ${after.minStock}`);

  const detail = extras.length ? ` · ${extras.join(", ")}` : "";
  return `Estoque: ${step} — ${input.reason}${detail}`;
}

/** Movimentação pronta para gravação na coleção `stockMovements`. */
export function buildMovement(params: {
  id: string;
  productId: string;
  productTitle: string;
  input: StockAdjustInput;
  before: StockState;
  after: StockState;
  actor: string;
  at: string;
}): StockMovement {
  return {
    id: params.id,
    productId: params.productId,
    productTitle: params.productTitle,
    kind: params.input.kind,
    qty: params.input.kind === "ajuste" ? params.after.stock : params.input.qty,
    before: params.before.stock,
    after: params.after.stock,
    reason: params.input.reason,
    actor: params.actor,
    at: params.at,
  };
}
