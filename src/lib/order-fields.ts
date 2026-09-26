import { normalizeStatus } from "@/lib/order-status";
import type { Order, OrderAddress, OrderGift, OrderItem } from "@/lib/types";

/**
 * Modelo de pedido legado (fase anterior à migração para o Documento Mestre)
 * convivendo com o modelo atual: `number`/`customerEmail`/`payment.method`
 * viram `code`/`email`/`paymentMethod`, e os itens `name`/`typeSlug` viram
 * `title`/`digital`. Módulo puro (client + server) — uma leitura só forma.
 */

type Bag = Record<string, unknown>;

function pick(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** `payment.method` legado ("pix", "credit_card", "debit_card") → enum §17. */
function paymentMethodOf(raw: unknown): Order["paymentMethod"] {
  const method = String((raw as Bag | undefined)?.method ?? "").toLowerCase();
  if (!method || method === "pix") return "pix";
  if (method.includes("debit")) return "debito";
  return "credito";
}

function normalizeItems(raw: unknown): OrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const item = (entry ?? {}) as Bag;
    const typeSlug = String(item.typeSlug ?? "").toLowerCase();
    const digital =
      typeof item.digital === "boolean" ? item.digital : typeSlug === "digital";
    const normalized: OrderItem = {
      productId: String(item.productId ?? ""),
      title: pick(item.title, item.name) ?? "Item do pedido",
      price: number(item.price),
      qty: Math.max(1, Math.round(number(item.qty, 1))),
      digital,
    };
    if (item.preOrder) normalized.preOrder = true;
    return normalized;
  });
}

/** Normaliza um documento de `orders` para o modelo atual (§17). */
export function normalizeOrder(raw: unknown): Order {
  const input = (raw ?? {}) as Bag;
  const customerLegacy = (input.customer ?? null) as Bag | null;

  const email = pick(input.email, input.customerEmail) ?? "";
  const userId = pick(input.userId, input.customerId);
  const numberCode = input.number;
  const code =
    pick(input.code) ??
    (numberCode === undefined || numberCode === null || numberCode === ""
      ? ""
      : `#${numberCode}`);

  const name = pick(customerLegacy?.name, input.customerName);
  const phone = pick(customerLegacy?.phone, input.customerPhone);

  return {
    id: String(input.id ?? ""),
    code,
    userId,
    email,
    items: normalizeItems(input.items),
    subtotal: number(input.subtotal),
    shipping: number(input.shipping),
    total: number(input.total),
    paymentMethod:
      pick(input.paymentMethod) !== undefined
        ? (pick(input.paymentMethod) as Order["paymentMethod"])
        : paymentMethodOf(input.payment),
    status: normalizeStatus(input.status),
    createdAt: String(input.createdAt ?? ""),
    couponCode: pick(input.couponCode) ?? null,
    discount: number(input.discount),
    gift: (input.gift as OrderGift | undefined) ?? null,
    address: (input.address as OrderAddress | undefined) ?? null,
    customer: name || phone ? { name: name ?? "", phone: phone ?? "" } : null,
    updatedAt: pick(input.updatedAt),
  };
}

/** Rótulo do método de pagamento (painel e `/pedidos`). */
export const PAYMENT_LABEL: Record<Order["paymentMethod"], string> = {
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
};
