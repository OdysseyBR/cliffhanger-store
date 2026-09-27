import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeNotificationInput } from "@/lib/marketing-fields";
import type { StoreNotification } from "@/lib/types";

/**
 * §12/§16 — edição e exclusão de comunicado. Id imutável; enviada é
 * estado final (não volta a rascunho); toda mudança vai à auditoria.
 */

type RouteCtx = { params: Promise<{ id: string }> };

const STATUS_LABEL = { draft: "rascunho", scheduled: "agendada", sent: "enviada" } as const;

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "notifications.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("notifications").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Notificação não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<StoreNotification>) } as StoreNotification;

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeNotificationInput(body?.item, previous);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const item = parsed.item;
  if (item.id !== id) {
    return Response.json({ error: "O id da notificação não pode ser alterado." }, { status: 400 });
  }

  try {
    await ref.set(plainDoc(item));
  } catch {
    return Response.json({ error: "Falha ao gravar a notificação." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Notificações",
    entity: "notification",
    entityId: id,
    summary: `Atualizou a notificação “${item.title}” (${STATUS_LABEL[previous.status] ?? previous.status} → ${STATUS_LABEL[item.status]})`,
    before: previous,
    after: item,
  });

  return Response.json({ ok: true, item });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "notifications.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("notifications").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Notificação não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<StoreNotification>) } as StoreNotification;

  if (previous.status === "sent") {
    return Response.json(
      { error: "Notificação enviada não pode ser excluída — o histórico precisa ficar." },
      { status: 400 },
    );
  }

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir a notificação." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Notificações",
    entity: "notification",
    entityId: id,
    summary: `Excluiu a notificação “${previous.title}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
