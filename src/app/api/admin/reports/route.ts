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
 * §12/§36 — Relatórios: as 17 áreas pedidas na §36 (vendas, produtos,
 * estoque, clientes, pedidos, Cliffhanger+, cancelamentos, pré-vendas,
 * Drops, biblioteca digital, e-books, audiobooks, Clube do Leitor,
 * campanhas, cupons, wishlist e conversão) e o painel de integração da
 * §37 (conta × site × app × admin) — tudo derivado de coleções reais,
 * sem métrica estimada; a definição de conversão vai identificada.
 * Acesso: `reports.view` (comercial, marketing, financeiro, administrador).
 */

const MAX_DAYS = 365;

const CONVERSION_DEFINITION =
  "Definição explícita (§36): conversão = pedidos pagos ÷ pedidos criados no período; " +
  "engajamento de clientes = contas cadastradas com compra concluída ÷ contas cadastradas. " +
  "Ambas vêm de pedidos e cadastros reais — não há estimativa de tráfego.";

type Order = ReturnType<typeof normalizeOrder>;

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
      customersSnap,
      usersSnap,
      subscriptionsSnap,
      dropsSnap,
      claimsSnap,
      boxesSnap,
      membersSnap,
      benefitsSnap,
      launchesSnap,
      auditSnap,
      adminUsersSnap,
      appSnap,
    ] = await Promise.all([
      db.collection("orders").get(),
      db.collection("products").get(),
      db.collection("libraries").get(),
      db.collection("coupons").get(),
      db.collection("promotions").get(),
      db.collection("reviews").get(),
      db.collection("notifications").get(),
      db.collection("customers").get(),
      db.collection("users").get(),
      db.collection("subscriptions").get(),
      db.collection("drops").get(),
      db.collection("dropClaims").get(),
      db.collection("clubBoxes").get(),
      db.collection("clubMembers").get(),
      db.collection("clubBenefits").get(),
      db.collection("launches").get(),
      db.collection("auditLogs").limit(500).get(),
      db.collection("adminUsers").get(),
      db.collection("site").doc("app").get(),
    ]);

    // --------------------------------------------------------- pedidos/vendas
    const allOrders: Order[] = ordersSnap.docs
      .map((doc) => normalizeOrder(revive({ id: doc.id, ...doc.data() })))
      .filter((order) => order.email);
    const orders = since ? allOrders.filter((order) => order.createdAt >= since) : allOrders;
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
      low: products.filter(
        (p) =>
          Number(p.stock ?? 0) > 0 &&
          (p.minStock ?? 0) > 0 &&
          Number(p.stock ?? 0) <= Number(p.minStock ?? 0),
      ).length,
      out: products.filter((p) => Number(p.stock ?? 0) <= 0).length,
    };

    // ------------------------------------------------- clientes (§36)
    const profileEmails = new Set<string>();
    for (const doc of customersSnap.docs) {
      const email = String((doc.data() as { email?: unknown }).email ?? "")
        .trim()
        .toLowerCase();
      if (email) profileEmails.add(email);
    }
    const orderEmails = new Set(allOrders.map((order) => order.email.toLowerCase()));
    let clientsTotal = customersSnap.size;
    for (const email of orderEmails) {
      if (!profileEmails.has(email)) clientsTotal += 1;
    }

    const firstOrderAt = new Map<string, string>();
    for (const order of allOrders) {
      const key = order.email.toLowerCase();
      const current = firstOrderAt.get(key);
      if (!current || order.createdAt < current) firstOrderAt.set(key, order.createdAt);
    }
    const newInPeriod = since
      ? [...firstOrderAt.values()].filter((iso) => iso >= since).length
      : firstOrderAt.size;

    const buyerAgg = new Map<string, { orders: number; spent: number; name: string }>();
    for (const order of orders) {
      const key = order.email.toLowerCase();
      const entry = buyerAgg.get(key) ?? { orders: 0, spent: 0, name: "" };
      entry.orders += 1;
      if (order.status !== "cancelado") entry.spent += order.total;
      if (!entry.name) entry.name = String(order.customer?.name ?? "").trim();
      buyerAgg.set(key, entry);
    }
    const clientsTop = [...buyerAgg.entries()]
      .map(([email, entry]) => ({
        email,
        name: entry.name,
        orders: entry.orders,
        spent: entry.spent,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    // ------------------------------------------------ cancelamentos (§36)
    const cancelledOrders = orders.filter((order) => order.status === "cancelado");
    const cancellations = {
      orders: cancelledOrders.length,
      value: cancelledOrders.reduce((sum, order) => sum + order.total, 0),
      rate: orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0,
    };

    // -------------------------------------------------- pré-vendas (§36)
    const launches = launchesSnap.docs.map(
      (doc) => revive(doc.data()) as { preOrder?: unknown },
    );
    const preProducts = products.filter((p) => p.badge === "PRÉ-VENDA");
    const preIds = new Set(preProducts.map((p) => p.id));
    let preorderUnits = 0;
    let preorderRevenue = 0;
    for (const order of orders) {
      if (order.status === "cancelado") continue;
      for (const item of order.items) {
        if (preIds.has(item.productId)) {
          preorderUnits += item.qty;
          preorderRevenue += item.price * item.qty;
        }
      }
    }
    const preorders = {
      launches: launches.filter((l) => l.preOrder === true).length,
      products: preProducts.length,
      reservedUnits: products.reduce((sum, p) => sum + Number(p.reserved ?? 0), 0),
      soldUnits: preorderUnits,
      revenue: preorderRevenue,
    };

    // ------------------------------------- Cliffhanger+ e Drops (§36)
    const subscriptions = subscriptionsSnap.docs.map((doc) => {
      const data = revive(doc.data()) as { plan?: unknown; price?: unknown; status?: unknown };
      return {
        plan: typeof data.plan === "string" ? data.plan : "",
        price: Number.isFinite(Number(data.price)) ? Number(data.price) : 0,
        status: typeof data.status === "string" ? data.status : "",
      };
    });
    const activeSubs = subscriptions.filter((sub) => sub.status === "ativo");
    const byPlan: Record<string, number> = { essential: 0, gold: 0, premium: 0 };
    for (const sub of activeSubs) {
      if (sub.plan) byPlan[sub.plan] = (byPlan[sub.plan] ?? 0) + 1;
    }
    const claimPermanence = (doc: { data: () => unknown }) =>
      String((doc.data() as { permanence?: unknown }).permanence ?? "");
    const plus = {
      subscribers: activeSubs.length,
      byPlan,
      mrr: activeSubs.reduce((sum, sub) => sum + sub.price, 0),
      cancelled: subscriptions.filter((sub) => sub.status === "cancelado").length,
      drops: dropsSnap.size,
      dropsActive: dropsSnap.docs.filter(
        (doc) => (doc.data() as { active?: unknown }).active === true,
      ).length,
      claims: claimsSnap.size,
      claimsTemp: claimsSnap.docs.filter((doc) => claimPermanence(doc) === "temporario").length,
      claimsPerma: claimsSnap.docs.filter((doc) => claimPermanence(doc) === "permanente").length,
    };

    // -------------------------------------- formatos (§36: ebooks/audiobooks)
    const typeById = new Map(products.map((p) => [p.id, p.type]));
    const formats = {
      ebooks: {
        products: products.filter((p) => p.type === "ebook").length,
        soldUnits: 0,
        revenue: 0,
      },
      audiobooks: {
        products: products.filter((p) => p.type === "audiobook").length,
        soldUnits: 0,
        revenue: 0,
      },
      physical: {
        products: products.filter((p) => p.type !== "ebook" && p.type !== "audiobook").length,
        soldUnits: 0,
        revenue: 0,
      },
    };
    for (const order of orders) {
      if (order.status === "cancelado") continue;
      for (const item of order.items) {
        const type = typeById.get(item.productId);
        const bucket =
          type === "ebook"
            ? formats.ebooks
            : type === "audiobook"
              ? formats.audiobooks
              : formats.physical;
        bucket.soldUnits += item.qty;
        bucket.revenue += item.price * item.qty;
      }
    }

    // --------------------------------- Clube do Leitor/Club (§36)
    const boxStatus = (doc: { data: () => unknown }) =>
      String((doc.data() as { status?: unknown }).status ?? "");
    const pointsOf = (doc: { data: () => unknown }) =>
      Number((doc.data() as { points?: unknown }).points) || 0;
    const benefitsActive = benefitsSnap.docs.filter(
      (doc) => (doc.data() as { active?: unknown }).active === true,
    ).length;
    const readerClub = {
      boxes: boxesSnap.size,
      planned: boxesSnap.docs.filter((doc) => boxStatus(doc) === "planejada").length,
      preparing: boxesSnap.docs.filter((doc) => boxStatus(doc) === "em_preparo").length,
      shipped: boxesSnap.docs.filter((doc) => boxStatus(doc) === "enviada").length,
      members: membersSnap.size,
      points: membersSnap.docs.reduce((sum, doc) => sum + pointsOf(doc), 0),
      benefits: benefitsSnap.size,
      benefitsActive,
    };

    // ---------------------------------------------------- biblioteca (§36)
    let libItems = 0;
    const libProductIds = new Set<string>();
    const progressSnaps = await Promise.all(
      librariesSnap.docs.map((doc) => doc.ref.collection("progress").get()),
    );
    let withProgress = 0;
    let progressSum = 0;
    const reading = { entries: 0, sum: 0 };
    const listening = { entries: 0, sum: 0 };
    librariesSnap.docs.forEach((doc, index) => {
      const items = (doc.data() as { items?: unknown[] }).items;
      if (Array.isArray(items)) {
        libItems += items.length;
        for (const raw of items) {
          const productId = (raw as { productId?: unknown } | null)?.productId;
          if (typeof productId === "string" && productId) libProductIds.add(productId);
        }
      }
      for (const entry of progressSnaps[index].docs) {
        const data = entry.data() as { percent?: unknown; kind?: unknown };
        const percent = Math.max(0, Math.min(100, Number(data.percent) || 0));
        withProgress += 1;
        progressSum += percent;
        if (data.kind === "audiobook") {
          listening.entries += 1;
          listening.sum += percent;
        } else {
          reading.entries += 1;
          reading.sum += percent;
        }
      }
    });

    // ---------------------------------------------------- wishlist (§36)
    const titleById = new Map(products.map((p) => [p.id, p.title]));
    const saves = new Map<string, number>();
    let wishlistUsers = 0;
    let wishlistItems = 0;
    for (const doc of usersSnap.docs) {
      const list = (doc.data() as { wishlist?: unknown }).wishlist;
      if (!Array.isArray(list) || list.length === 0) continue;
      wishlistUsers += 1;
      for (const raw of list) {
        if (typeof raw !== "string" || !raw) continue;
        wishlistItems += 1;
        saves.set(raw, (saves.get(raw) ?? 0) + 1);
      }
    }
    const wishlistTop = [...saves.entries()]
      .map(([productId, count]) => ({
        productId,
        title: titleById.get(productId) ?? productId,
        saves: count,
      }))
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 5);

    // -------------------------------------------------- conversão (§36)
    const paidBuyerEmails = new Set(
      allOrders
        .filter((order) => REVENUE_STATUS.includes(order.status))
        .map((order) => order.email.toLowerCase()),
    );
    let registeredBuyers = 0;
    for (const email of profileEmails) {
      if (paidBuyerEmails.has(email)) registeredBuyers += 1;
    }
    const conversion = {
      definition: CONVERSION_DEFINITION,
      ordersPlaced: orders.length,
      ordersPaid: paid.length,
      paidRate: orders.length > 0 ? (paid.length / orders.length) * 100 : 0,
      registered: customersSnap.size,
      registeredBuyers,
      buyerRate: customersSnap.size > 0 ? (registeredBuyers / customersSnap.size) * 100 : 0,
    };

    // ---------------------------------------------- campanhas/cupons (§36)
    const coupons = couponsSnap.docs.map((doc) => doc.data() as Partial<Coupon>);
    const promotions = promotionsSnap.docs.map((doc) => doc.data() as Partial<Promotion>);
    const reviews = reviewsSnap.docs.map((doc) => doc.data() as Partial<Review>);
    const now = Date.now();
    const notifications = notificationsSnap.docs.map(
      (doc) => doc.data() as Partial<StoreNotification>,
    );
    const isPromotionActive = (p: Partial<Promotion>) => {
      if (!p.active) return false;
      const start = p.startsAt ? Date.parse(p.startsAt) : null;
      const end = p.endsAt ? Date.parse(p.endsAt) : null;
      if (start !== null && now < start) return false;
      if (end !== null && now > end) return false;
      return true;
    };

    // ---------------------------------- integração conta/site/app/admin (§37)
    const collectionIds = new Set(libProductIds);
    for (const order of allOrders) {
      if (order.status === "cancelado") continue;
      for (const item of order.items) collectionIds.add(item.productId);
    }
    const appData = appSnap.exists
      ? (revive(appSnap.data()) as {
          highlights?: unknown;
          scanner?: { enabled?: unknown };
        })
      : null;
    const lastOrderAt = allOrders.reduce(
      (max, order) => (order.createdAt > max ? order.createdAt : max),
      "",
    );

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
        promotionsActive: promotions.filter(isPromotionActive).length,
        promotionsScheduled: promotions.filter((p) => {
          if (!p.active) return false;
          const start = p.startsAt ? Date.parse(p.startsAt) : null;
          return start !== null && now < start;
        }).length,
        promotionsTotal: promotions.length,
        reviewsAvg:
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / reviews.length
            : 0,
        reviewsPending: reviews.filter((r) => r.status === "pendente").length,
        notificationsSent: notifications.filter((n) => n.status === "sent").length,
      },
      clients: {
        total: clientsTotal,
        registered: customersSnap.size,
        newInPeriod,
        buyers: buyerAgg.size,
        top: clientsTop,
      },
      cancellations,
      preorders,
      plus,
      formats,
      readerClub,
      wishlist: { users: wishlistUsers, items: wishlistItems, top: wishlistTop },
      conversion,
      integration: {
        web: { orders: allOrders.length, customers: clientsTotal },
        app: {
          content: appSnap.exists,
          highlights: Array.isArray(appData?.highlights) ? appData.highlights.length : 0,
          scanner: Boolean(appData?.scanner?.enabled),
        },
        admin: { users: adminUsersSnap.size, auditLogs: auditSnap.size },
        account: {
          libraries: librariesSnap.size,
          libraryItems: libItems,
          collectionItems: collectionIds.size,
          wishlistUsers,
          wishlistItems,
          plusActive: activeSubs.length,
          reading: {
            entries: reading.entries,
            avgPercent: reading.entries > 0 ? reading.sum / reading.entries : 0,
          },
          listening: {
            entries: listening.entries,
            avgPercent: listening.entries > 0 ? listening.sum / listening.entries : 0,
          },
          benefits: benefitsActive,
          historyOrders: allOrders.length,
          lastOrderAt,
        },
      },
    };

    return Response.json({ report: summary });
  } catch {
    return Response.json({ error: "Falha ao gerar o relatório." }, { status: 500 });
  }
}
