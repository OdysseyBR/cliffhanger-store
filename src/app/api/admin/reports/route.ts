import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import { normalizeOrder } from "@/lib/order-fields";
import { REVENUE_STATUS } from "@/lib/order-status";
import type {
  Coupon,
  Product,
  Promotion,
  ReportSummary,
  Review,
  StoreNotification,
} from "@/lib/types";

/**
 * §12 — Relatórios: agregados somente leitura (comercial, marketing,
 * financeiro e administrador). Vendas por período (?days=7|30|90|365,
 * vazio = desde sempre), top produtos, estoque, digital e marketing —
 * tudo derivado do banco, sem coleção própria.
 */

const MAX_DAYS = 365;

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "reports.view");
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
    const [
      ordersSnap,
      productsSnap,
      librariesSnap,
      couponsSnap,
      promotionsSnap,
      reviewsSnap,
      notificationsSnap,
    ] = await Promise.all([
      db.collection("orders").get(),
      db.collection("products").get(),
      db.collection("libraries").get(),
      db.collection("coupons").get(),
      db.collection("promotions").get(),
      db.collection("reviews").get(),
      db.collection("notifications").get(),
    ]);

    const orders = ordersSnap.docs
      .map((doc) => normalizeOrder(revive({ id: doc.id, ...doc.data() })))
      .filter((order) => order.email && (!since || order.createdAt >= since));

    const paid = orders.filter((order) => REVENUE_STATUS.includes(order.status));
    const revenue = paid.reduce((sum, order) => sum + order.total, 0);

    const byStatus: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    let discounts = 0;
    let shipping = 0;
    const productSales = new Map<string, { title: string; qty: number; revenue: number }>();
    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
      byPayment[order.paymentMethod] = (byPayment[order.paymentMethod] ?? 0) + 1;
      if (order.status !== "cancelado") {
        discounts += order.discount ?? 0;
        shipping += order.shipping;
        for (const item of order.items) {
          const entry = productSales.get(item.productId) ?? { title: item.title, qty: 0, revenue: 0 };
          entry.qty += item.qty;
          entry.revenue += item.price * item.qty;
          productSales.set(item.productId, entry);
        }
      }
    }
    const topProducts = [...productSales.entries()]
      .map(([productId, entry]) => ({ productId, ...entry }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const products = productsSnap.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as Partial<Product>) }) as Product,
    );
    const stock = {
      skus: products.length,
      units: products.reduce((sum, p) => sum + Number(p.stock ?? 0), 0),
      low: products.filter((p) => Number(p.stock ?? 0) > 0 && (p.minStock ?? 0) > 0 && Number(p.stock ?? 0) <= Number(p.minStock ?? 0)).length,
      out: products.filter((p) => Number(p.stock ?? 0) <= 0).length,
    };

    let libItems = 0;
    for (const doc of librariesSnap.docs) {
      const items = (doc.data() as { items?: unknown[] }).items;
      if (Array.isArray(items)) libItems += items.length;
    }
    let withProgress = 0;
    let progressSum = 0;
    for (const doc of librariesSnap.docs) {
      const prog = await doc.ref.collection("progress").get();
      for (const entry of prog.docs) {
        const percent = Number((entry.data() as { percent?: unknown }).percent) || 0;
        withProgress += 1;
        progressSum += Math.max(0, Math.min(100, percent));
      }
    }

    const coupons = couponsSnap.docs.map((doc) => doc.data() as Partial<Coupon>);
    const promotions = promotionsSnap.docs.map((doc) => doc.data() as Partial<Promotion>);
    const reviews = reviewsSnap.docs.map((doc) => doc.data() as Partial<Review>);
    const now = Date.now();
    const notifications = notificationsSnap.docs.map((doc) => doc.data() as Partial<StoreNotification>);

    const summary: ReportSummary = {
      days,
      since,
      sales: {
        orders: orders.length,
        revenue,
        avgTicket: paid.length > 0 ? revenue / paid.length : 0,
        discounts,
        shipping,
        byStatus,
        byPayment,
      },
      topProducts,
      stock,
      digital: {
        libraries: librariesSnap.size,
        items: libItems,
        withProgress,
        avgProgress: withProgress > 0 ? progressSum / withProgress : 0,
      },
      marketing: {
        couponsActive: coupons.filter((c) => c.active).length,
        couponsUsed: coupons.reduce((sum, c) => sum + Number(c.usedCount ?? 0), 0),
        promotionsActive: promotions.filter((p) => {
          if (!p.active) return false;
          const start = p.startsAt ? Date.parse(p.startsAt) : null;
          const end = p.endsAt ? Date.parse(p.endsAt) : null;
          if (start !== null && now < start) return false;
          if (end !== null && now > end) return false;
          return true;
        }).length,
        reviewsAvg:
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / reviews.length
            : 0,
        reviewsPending: reviews.filter((r) => r.status === "pendente").length,
        notificationsSent: notifications.filter((n) => n.status === "sent").length,
      },
    };

    return Response.json({ report: summary });
  } catch {
    return Response.json({ error: "Falha ao gerar o relatório." }, { status: 500 });
  }
}
