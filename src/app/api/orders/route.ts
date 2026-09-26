import { randomUUID } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminApp, getAdminDb, revive } from "@/lib/firebase-admin";
import { getProducts } from "@/lib/data";
import { grantLibraryItems } from "@/lib/library";
import { normalizeStatus } from "@/lib/order-status";
import { evaluateCoupon, normalizeCouponCode } from "@/lib/coupons";
import { fallbackShippingPrice, quoteShipping } from "@/lib/shipping";
import type { Coupon, Order, OrderGift, OrderItem, OrderStatus } from "@/lib/types";

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
  /** modalidade escolhida no checkout — o preço é recalculado no servidor */
  shippingOption?: "standard" | "express";
  shipping?: number;
  coupon?: string;
  /** §17 — opção de presente (destinatário, recado, embrulho) */
  gift?: OrderGift;
}

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
      ...(product.badge === "PRÉ-VENDA" ? { preOrder: true } : {}),
    });
    subtotal += product.price * qty;
  }

  // §17 — frete recalculado no servidor pelo CEP + modalidade escolhida;
  // o valor enviado pelo cliente nunca é confiado. Só itens FÍSICOS pesam.
  const hasPhysical = orderItems.some((item) => !item.digital);
  const itemCount = orderItems
    .filter((item) => !item.digital)
    .reduce((sum, item) => sum + item.qty, 0);
  const option = payload.shippingOption === "express" ? "express" : "standard";
  const quote = quoteShipping({
    cep: payload.address?.cep ?? "",
    itemCount,
    subtotal,
  });
  const shipping = hasPhysical
    ? (quote?.options.find((o) => o.id === option)?.price ??
      fallbackShippingPrice(subtotal, option))
    : 0;

  // §17 — cupom: revalidado no servidor; desconto aplicado ao total.
  const db = getAdminDb();
  let discount = 0;
  let couponCode: string | null = null;
  const requestedCoupon = normalizeCouponCode(payload.coupon ?? "");
  if (requestedCoupon) {
    if (!db) {
      return Response.json(
        { error: "Cupons indisponíveis neste ambiente — remova o cupom." },
        { status: 503 },
      );
    }
    const snap = await db.collection("coupons").doc(requestedCoupon).get();
    if (!snap.exists) {
      return Response.json({ error: "Cupom não encontrado." }, { status: 400 });
    }
    const coupon = { ...snap.data() } as Coupon;
    const evaluation = evaluateCoupon(coupon, subtotal);
    if (!evaluation.ok) {
      return Response.json(
        { error: evaluation.error ?? "Cupom inválido." },
        { status: 400 },
      );
    }
    discount = evaluation.discount ?? 0;
    couponCode = typeof coupon.code === "string" && coupon.code ? coupon.code : requestedCoupon;
  }

  // §17 — opção de presente (só grava com destinatário preenchido).
  const gift: OrderGift | null =
    payload.gift && payload.gift.to.trim()
      ? {
          to: payload.gift.to.trim().slice(0, 80),
          message: (payload.gift.message ?? "").trim().slice(0, 300),
          wrap: Boolean(payload.gift.wrap),
        }
      : null;

  const total = subtotal - discount + shipping;

  const status: OrderStatus = "aguardando_pagamento";
  const now = new Date().toISOString();

  // Sessão opcional: quando o cliente está logado, anexa o dono ao pedido
  // para o histórico de `/pedidos`. Token inválido segue como visitante.
  let userId: string | null = null;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = /^Bearer (.+)$/.exec(authHeader)?.[1];
  if (bearer) {
    try {
      const app = getAdminApp();
      if (app) userId = (await getAuth(app).verifyIdToken(bearer)).uid;
    } catch {
      /* sem sessão válida → compra de visitante */
    }
  }

  const order: Omit<Order, "id"> = {
    code: `CH-${randomUUID().slice(0, 8).toUpperCase()}`,
    email: payload.email,
    items: orderItems,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
    paymentMethod: payload.paymentMethod ?? "pix",
    status,
    createdAt: now,
    couponCode,
    discount: Number(discount.toFixed(2)),
    gift,
  };

  let id: string = randomUUID();

  if (db) {
    try {
      const ref = await db.collection("orders").add({
        ...order,
        userId,
        customer: {
          name: payload.name ?? "",
          phone: payload.phone ?? "",
        },
        address: payload.address ?? null,
        updatedAt: now,
      });
      id = ref.id;

      // §17 — consome 1 uso do cupom após a gravação bem-sucedida
      if (couponCode) {
        try {
          const { FieldValue } = await import("firebase-admin/firestore");
          await db.collection("coupons").doc(couponCode).update({
            usedCount: FieldValue.increment(1),
            updatedAt: now,
          });
        } catch (error) {
          console.warn("[orders] falha ao contabilizar uso do cupom:", error);
        }
      }
    } catch (error) {
      console.warn("[orders] falha ao gravar no Firestore:", error);
    }
  }

  // §8 — compra logada: libera os itens digitais na biblioteca da conta
  // (controle de acesso/licença). Visitante segue com o espelho local.
  if (userId) {
    try {
      await grantLibraryItems(userId, orderItems, products, id);
    } catch (error) {
      console.warn("[orders] falha ao liberar itens na biblioteca:", error);
    }
  }

  return Response.json({
    ok: true,
    orderId: id,
    code: order.code,
    total: order.total,
    shipping: order.shipping,
    discount: order.discount,
    gift: Boolean(gift),
    digitalItems: orderItems.filter((i) => i.digital).map((i) => i.productId),
    persisted: Boolean(db),
    status,
  });
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
