import { getAdminDb, revive } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import { normalizeOrder } from "@/lib/order-fields";
import type { CollectionEntry } from "@/lib/account-fields";
import type { LibraryItem, Order, Product, Universe, Work } from "@/lib/types";

/**
 * §14 — Minha Coleção ("eu tenho"): derivados das compras, sem coleção
 * própria. Digitais vêm de `libraries/{uid}`; físicos, dos itens não
 * cancelados de `/api/orders/mine`. Agrupados por universo via catálogo.
 * Compras entram sozinhas — wishlist continua sendo o "quero ter".
 */

export async function GET(request: Request) {
  const gate = await requireUser(request);
  if (isUserGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Coleção indisponível neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const base = db.collection("libraries").doc(gate.uid);
    const [libSnap, ordersSnap, productsSnap, universesSnap, worksSnap] = await Promise.all([
      base.get(),
      db.collection("orders").where("userId", "==", gate.uid).limit(50).get(),
      db.collection("products").get(),
      db.collection("universes").get(),
      db.collection("works").get(),
    ]);

    const products = new Map(
      productsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...(doc.data() as Partial<Product>) } as Product]),
    );
    const universes = new Map(
      universesSnap.docs.map((doc) => [doc.id, (doc.data() as Partial<Universe>).name ?? "Universo"]),
    );
    const works = new Map(
      worksSnap.docs.map((doc) => [doc.id, doc.data() as Partial<Work>]),
    );

    const email = gate.email.toLowerCase();
    let emailOrders: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (email) {
      const byEmail = await db.collection("orders").where("email", "==", email).limit(50).get();
      emailOrders = byEmail.docs;
    }
    const merged = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const doc of [...ordersSnap.docs, ...emailOrders]) merged.set(doc.id, doc);
    const orders = [...merged.values()]
      .map((doc) => normalizeOrder(revive({ id: doc.id, ...doc.data() })) as Order)
      .filter((order) => order.email && order.status !== "cancelado");

    const entries = new Map<string, CollectionEntry>();

    if (libSnap.exists) {
      const data = revive(libSnap.data()) as { items?: unknown[] };
      const items = Array.isArray(data.items) ? (data.items as LibraryItem[]) : [];
      for (const item of items) {
        if (!item?.productId) continue;
        const product = products.get(item.productId);
        const universeId = product?.universeId ?? works.get(product?.workId ?? "")?.universeId;
        entries.set(item.productId, {
          productId: item.productId,
          title: item.title || product?.title || "Item digital",
          digital: true,
          kind: item.type === "audiobook" ? "audiobook" : "ebook",
          universeId,
          universeName: universeId ? universes.get(universeId) : undefined,
          workId: product?.workId,
          acquiredAt: item.purchasedAt,
          orderId: item.orderId,
        });
      }
    }

    for (const order of orders) {
      for (const line of order.items) {
        if (!line.productId || entries.has(line.productId)) continue;
        const product = products.get(line.productId);
        const universeId = product?.universeId ?? works.get(product?.workId ?? "")?.universeId;
        entries.set(line.productId, {
          productId: line.productId,
          title: line.title || product?.title || "Item",
          digital: product?.digital ?? false,
          kind: product?.type ?? (product?.digital ? "ebook" : "livro-fisico"),
          universeId,
          universeName: universeId ? universes.get(universeId) : undefined,
          workId: product?.workId,
          acquiredAt: order.createdAt,
          orderId: order.id,
        });
      }
    }

    const list = [...entries.values()].sort((a, b) =>
      String(b.acquiredAt).localeCompare(String(a.acquiredAt)),
    );
    return Response.json({ items: list });
  } catch {
    return Response.json({ error: "Falha ao montar a coleção." }, { status: 500 });
  }
}
