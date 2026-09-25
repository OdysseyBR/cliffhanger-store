import { getAdminDb, revive } from "@/lib/firebase-admin";
import { normalizeStatus } from "@/lib/order-status";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import type { Order } from "@/lib/types";

/**
 * Histórico de pedidos do cliente logado (Documento de Correção §17 —
 * acompanhamento e histórico; §22 — rota `/pedidos`).
 *
 * Casa por `userId` (anexado no checkout) e também por e-mail da conta,
 * para recuperar pedidos feitos antes do vínculo. Consultas de campo único
 * — sem índice composto.
 */
export async function GET(request: Request) {
  const gate = await requireUser(request);
  if (isUserGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const byUid = await db
      .collection("orders")
      .where("userId", "==", gate.uid)
      .limit(50)
      .get();

    const merged = new Map<string, Order>();
    for (const doc of byUid.docs) {
      const order = revive({ id: doc.id, ...doc.data() }) as Order;
      merged.set(order.id, { ...order, status: normalizeStatus(order.status) });
    }

    if (gate.email) {
      const byEmail = await db
        .collection("orders")
        .where("email", "==", gate.email)
        .limit(50)
        .get();
      for (const doc of byEmail.docs) {
        const order = revive({ id: doc.id, ...doc.data() }) as Order;
        merged.set(order.id, { ...order, status: normalizeStatus(order.status) });
      }
    }

    const orders = [...merged.values()]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 50);

    return Response.json({ orders });
  } catch {
    return Response.json(
      { error: "Falha ao ler os pedidos." },
      { status: 500 },
    );
  }
}
