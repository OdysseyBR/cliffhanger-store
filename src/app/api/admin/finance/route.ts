import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import { normalizeOrder } from "@/lib/order-fields";
import { REVENUE_STATUS } from "@/lib/order-status";
import type { FinanceSummary } from "@/lib/types";

/**
 * §12 — Financeiro: receita, pendências e cancelamentos sobre os pedidos
 * (comercial, financeiro e administrador). Somente leitura — não há
 * `finance.edit` na matriz §13; o dinheiro nasce do checkout (§17).
 */

const MAX_DAYS = 365;
const ENTRY_LIMIT = 200;

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "finance.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const daysParam = new URL(request.url).searchParams.get("days");
  const days = daysParam === null || daysParam === "" ? 0 : Number(daysParam);
  if (!Number.isInteger(days) || days < 0 || days > MAX_DAYS) {
    return Response.json(
      { error: "Período inválido (use 7, 30, 90, 365 ou vazio para tudo)." },
      { status: 400 },
    );
  }
  const since = days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : "";

  try {
    const snap = await db.collection("orders").get();
    const orders = snap.docs
      .map((doc) => normalizeOrder(revive({ id: doc.id, ...doc.data() })))
      .filter((order) => order.email && (!since || order.createdAt >= since))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const paid = orders.filter((order) => REVENUE_STATUS.includes(order.status));
    const revenue = paid.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter((order) => order.status === "aguardando_pagamento");
    const cancelled = orders.filter((order) => order.status === "cancelado");

    const byMethod: FinanceSummary["byMethod"] = {};
    for (const order of paid) {
      const entry = byMethod[order.paymentMethod] ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += order.total;
      byMethod[order.paymentMethod] = entry;
    }

    const summary: FinanceSummary = {
      days,
      since,
      revenue,
      pending: pendingOrders.reduce((sum, order) => sum + order.total, 0),
      cancelledOrders: cancelled.length,
      cancelledValue: cancelled.reduce((sum, order) => sum + order.total, 0),
      discounts: paid.reduce((sum, order) => sum + (order.discount ?? 0), 0),
      shipping: paid.reduce((sum, order) => sum + order.shipping, 0),
      avgTicket: paid.length > 0 ? revenue / paid.length : 0,
      byMethod,
      entries: orders.slice(0, ENTRY_LIMIT).map((order) => ({
        id: order.id,
        code: order.code || order.id,
        createdAt: order.createdAt,
        status: order.status,
        total: order.total,
        discount: order.discount ?? 0,
        shipping: order.shipping,
        paymentMethod: order.paymentMethod,
        customer: order.customer?.name || order.email,
      })),
    };

    return Response.json({ finance: summary });
  } catch {
    return Response.json({ error: "Falha ao ler o financeiro." }, { status: 500 });
  }
}
