import { randomUUID } from "node:crypto";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import { getProducts } from "@/lib/data";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

interface CheckoutPayload {
  items: { productId: string; qty: number }[];
  email: string;
  name?: string;
  phone?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  paymentMethod: Order["paymentMethod"];
  shipping?: number;
  coupon?: string;
}

const FREE_SHIPPING_FROM = 199;

/**
 * Cria um pedido (Checkout → Pedido concluído).
 * Persiste em `orders` quando o Firestore está configurado.
 */
export async function POST(request: Request) {
  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!payload?.items?.length || !payload.email?.includes("@")) {
    return Response.json(
      { error: "Informe itens válidos e um e-mail." },
      { status: 400 },
    );
  }

  const products = await getProducts();
  const orderItems: OrderItem[] = [];
  let subtotal = 0;

  for (const line of payload.items) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) {
      return Response.json(
        { error: `Produto indisponível: ${line.productId}` },
        { status: 409 },
      );
    }
    const qty = Math.max(1, Math.min(99, Number(line.qty) || 1));
    orderItems.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      qty,
      digital: product.digital,
    });
    subtotal += product.price * qty;
  }

  const hasPhysical = orderItems.some((item) => !item.digital);
  const requestedShipping = Number(payload.shipping) || 0;
  const shipping =
    hasPhysical && requestedShipping > 0
      ? requestedShipping
      : hasPhysical && subtotal >= FREE_SHIPPING_FROM
        ? 0
        : hasPhysical
          ? 24.9
          : 0;

  const status: OrderStatus = "aguardando_pagamento";
  const now = new Date().toISOString();

  const order: Omit<Order, "id"> = {
    code: `CH-${randomUUID().slice(0, 8).toUpperCase()}`,
    email: payload.email,
    items: orderItems,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number((subtotal + shipping).toFixed(2)),
    paymentMethod: payload.paymentMethod ?? "pix",
    status,
    createdAt: now,
  };

  const db = getAdminDb();
  let id: string = randomUUID();

  if (db) {
    try {
      const ref = await db.collection("orders").add({
        ...order,
        userId: null,
        customer: {
          name: payload.name ?? "",
          phone: payload.phone ?? "",
        },
        address: payload.address ?? null,
        coupon: payload.coupon ?? null,
        updatedAt: now,
      });
      id = ref.id;
    } catch (error) {
      console.warn("[orders] falha ao gravar no Firestore:", error);
    }
  }

  return Response.json({
    ok: true,
    orderId: id,
    code: order.code,
    total: order.total,
    shipping: order.shipping,
    digitalItems: orderItems.filter((i) => i.digital).map((i) => i.productId),
    persisted: Boolean(db),
    status,
  });
}

/** Status em inglês vindos de pedidos antigos (demo) → enum Doc Mestre. */
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

function normalizeStatus(value: unknown): OrderStatus {
  const raw = typeof value === "string" ? value.trim() : "";
  if (KNOWN_STATUS.includes(raw as OrderStatus)) return raw as OrderStatus;
  return LEGACY_STATUS[raw.toLowerCase()] ?? (raw as OrderStatus);
}

/**
 * Lista pedidos para o painel (Doc Mestre 11.1 — Dashboard e módulo
 * Pedidos). Dados de cliente: exige super admin no servidor.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const orders = snap.docs.map((doc) => {
      const order = revive({ id: doc.id, ...doc.data() }) as Order;
      return { ...order, status: normalizeStatus(order.status) };
    });
    return Response.json({ orders });
  } catch {
    return Response.json(
      { error: "Falha ao ler os pedidos." },
      { status: 500 },
    );
  }
}
