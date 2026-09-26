import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { normalizeOrder } from "@/lib/order-fields";
import { ORDER_STATUS_LABEL, ORDER_STATUS_LIST, normalizeStatus } from "@/lib/order-status";

/**
 * §12 — módulo Pedidos: mudança de status pelo painel (acompanhamento do
 * fluxo Dados → Entrega → Pagamento → Revisão → Concluído, §17).
 * Exige `orders.edit`; toda troca fica registrada na auditoria (§13).
 * Pedidos não são excluídos — o histórico é preservado.
 */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "orders.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("orders").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const status = normalizeStatus(body?.status);
  if (!ORDER_STATUS_LIST.includes(status)) {
    return Response.json(
      { error: `Status inválido — use um dos: ${ORDER_STATUS_LIST.join(", ")}.` },
      { status: 400 },
    );
  }

  const order = normalizeOrder(revive({ id: existing.id, ...existing.data() }));
  const before = order.status;
  if (before === status) {
    return Response.json({ ok: true, changed: false, status: before });
  }

  const updatedAt = new Date().toISOString();
  try {
    await ref.set(plainDoc({ status, updatedAt }), { merge: true });
  } catch {
    return Response.json({ error: "Falha ao atualizar o pedido." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Pedidos",
    entity: "order",
    entityId: id,
    summary: `Pedido ${order.code ?? id}: ${ORDER_STATUS_LABEL[before]} → ${ORDER_STATUS_LABEL[status]}`,
    before: { status: before },
    after: { status, updatedAt },
  });

  return Response.json({ ok: true, changed: true, status, updatedAt });
}
