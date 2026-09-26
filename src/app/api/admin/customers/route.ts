import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import { normalizeOrder } from "@/lib/order-fields";
import type { AdminCustomer } from "@/lib/types";

/**
 * §12 — módulo Clientes: identidade das contas (coleção `customers`) somada
 * às compras dos pedidos (§17). A matriz §13 só concede `customers.view`,
 * então o módulo é somente leitura — o cadastro nasce do login/checkout.
 */

const RECENT_LIMIT = 5;

interface Profile {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

function emptyCustomer(id: string, name: string, email: string, phone?: string): AdminCustomer {
  return {
    id,
    name,
    email,
    phone,
    orders: 0,
    items: 0,
    spent: 0,
    firstOrderAt: "",
    lastOrderAt: "",
    lastStatus: null,
    recent: [],
  };
}

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "customers.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ customers: [] });

  try {
    const [ordersSnap, profilesSnap] = await Promise.all([
      db.collection("orders").get(),
      db.collection("customers").get(),
    ]);

    const map = new Map<string, AdminCustomer>();
    const byEmail = new Map<string, AdminCustomer>();

    // 1) identidade: contas cadastradas na loja
    for (const doc of profilesSnap.docs) {
      const profile = revive(doc.data()) as Profile;
      const email = String(profile.email ?? "").trim().toLowerCase();
      const uid = String(profile.id ?? doc.id);
      if (!email && !uid) continue;

      const name = String(profile.name ?? "").trim() || email || uid;
      const phone = String(profile.phone ?? "").trim();
      const entry = emptyCustomer(uid || email, name, email, phone || undefined);
      map.set(entry.id, entry);
      if (email && !byEmail.has(email)) byEmail.set(email, entry);
    }

    // 2) compras: pedidos normalizados (modelo legado e atual, §17)
    const rows = ordersSnap.docs
      .map((doc) => normalizeOrder(revive({ id: doc.id, ...doc.data() })))
      .filter((order) => Boolean(order.email))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    for (const order of rows) {
      const email = order.email.toLowerCase();
      const key = order.userId ?? email;

      const current =
        map.get(key) ??
        byEmail.get(email) ??
        emptyCustomer(key, order.customer?.name || email, email, order.customer?.phone || undefined);

      if (!map.has(current.id)) map.set(current.id, current);
      if (email && !byEmail.has(email)) byEmail.set(email, current);

      current.orders += 1;
      current.items += order.items.reduce((sum, item) => sum + item.qty, 0);
      if (order.status !== "cancelado") current.spent += order.total;
      if (order.customer?.name && (!current.name || current.name === current.email)) {
        current.name = order.customer.name;
      }
      if (order.customer?.phone && !current.phone) current.phone = order.customer.phone;

      if (order.createdAt) {
        if (!current.firstOrderAt || order.createdAt < current.firstOrderAt) {
          current.firstOrderAt = order.createdAt;
        }
        if (order.createdAt > current.lastOrderAt) {
          current.lastOrderAt = order.createdAt;
          current.lastStatus = order.status;
        }
      }

      if (current.recent.length < RECENT_LIMIT) {
        current.recent.push({
          id: order.id,
          code: order.code || order.id,
          createdAt: order.createdAt,
          status: order.status,
          total: order.total,
        });
      }
    }

    const customers = [...map.values()].sort((a, b) =>
      b.lastOrderAt.localeCompare(a.lastOrderAt),
    );
    return Response.json({ customers });
  } catch {
    return Response.json({ error: "Falha ao ler os clientes." }, { status: 500 });
  }
}
