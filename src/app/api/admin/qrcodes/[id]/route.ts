import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { normalizeQrEntry, sanitizeQrInput } from "@/lib/qr-fields";

/**
 * §34 — edição e exclusão de QR Code. Id imutável; toda mudança vai para
 * a auditoria (§35).
 */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "digital.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("qrCodes").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "QR Code não encontrado." }, { status: 404 });
  }
  const previous = normalizeQrEntry(id, existing.data());

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeQrInput(body?.item, previous);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const entry = parsed.item;
  if (entry.id !== id) {
    return Response.json({ error: "O id do QR Code não pode ser alterado." }, { status: 400 });
  }
  const action =
    previous && entry.active !== previous.active
      ? entry.active
        ? ("ativar" as const)
        : ("desativar" as const)
      : ("editar" as const);

  try {
    await ref.set(plainDoc(entry));
  } catch {
    return Response.json({ error: "Falha ao gravar o QR Code." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action,
    module: "QR Codes",
    entity: "qrCode",
    entityId: id,
    summary: `Atualizou o QR Code “${entry.label}” (${entry.type} → ${entry.target})`,
    before: previous,
    after: entry,
  });

  return Response.json({ ok: true, item: entry });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "digital.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("qrCodes").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "QR Code não encontrado." }, { status: 404 });
  }
  const previous = normalizeQrEntry(id, existing.data());

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir o QR Code." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "QR Codes",
    entity: "qrCode",
    entityId: id,
    summary: `Excluiu o QR Code “${previous?.label ?? id}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
