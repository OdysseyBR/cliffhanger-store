import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeNotificationInput } from "@/lib/marketing-fields";
import type { StoreNotification } from "@/lib/types";

/**
 * §12/§16 — Notificações: leitura e criação de comunicados (marketing e
 * administrador). O envio real por e-mail/app/push é feito pelo
 * disparador da plataforma; aqui se redige, agenda e registra o
 * comunicado — o status conta a história (rascunho → agendada → enviada).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "notifications.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("notifications").get();
    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<StoreNotification>) }) as StoreNotification)
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler as notificações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "notifications.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeNotificationInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const item = parsed.item;

  const exists = await db.collection("notifications").doc(item.id).get();
  if (exists.exists) {
    return Response.json({ error: "Já existe uma notificação com este identificador." }, { status: 409 });
  }

  try {
    await db.collection("notifications").doc(item.id).set(plainDoc(item));
  } catch {
    return Response.json({ error: "Falha ao gravar a notificação." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Notificações",
    entity: "notification",
    entityId: item.id,
    summary: `Criou a notificação “${item.title}” (${item.channels.join("+")} → ${item.targetAudience})`,
    after: item,
  });

  return Response.json({ ok: true, item }, { status: 201 });
}
