import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizeClubBoxInput } from "@/lib/plus-fields";
import { deleteClubBox, saveClubBox } from "@/lib/plus-admin";

/**
 * §26 — edição e exclusão de caixa do Clube do Leitor. Id imutável;
 * status operacional (planejada → em preparo → enviada) registra o que
 * precisa ser preparado no mês (§26).
 */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "plus.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("clubBoxes").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Caixa não encontrada." }, { status: 404 });
  }
  const previous: Record<string, unknown> = {
    id: existing.id,
    ...((existing.data() ?? {}) as Record<string, unknown>),
  };

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeClubBoxInput(body?.item, {
    id,
    createdAt: typeof previous.createdAt === "string" ? previous.createdAt : undefined,
  });
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const box = parsed.item;
  if (box.id !== id) {
    return Response.json({ error: "O id da caixa não pode ser alterado." }, { status: 400 });
  }

  const saved = await saveClubBox(box);
  if (!saved) {
    return Response.json({ error: "Falha ao gravar a caixa." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Cliffhanger+",
    entity: "clubBox",
    entityId: id,
    summary: `Atualizou a caixa “${box.title}” (${box.month}, ${box.status}, ${box.productIds.length} produto(s))`,
    before: previous,
    after: box,
  });

  return Response.json({ ok: true, item: saved });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "plus.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("clubBoxes").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Caixa não encontrada." }, { status: 404 });
  }
  const previous: Record<string, unknown> = {
    id: existing.id,
    ...((existing.data() ?? {}) as Record<string, unknown>),
  };

  const removed = await deleteClubBox(id);
  if (!removed) {
    return Response.json({ error: "Falha ao excluir a caixa." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Cliffhanger+",
    entity: "clubBox",
    entityId: id,
    summary: `Excluiu a caixa “${typeof previous.title === "string" ? previous.title : id}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
