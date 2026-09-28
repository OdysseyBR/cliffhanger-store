import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizeDropInput } from "@/lib/plus-fields";
import { deleteDrop, listDropsAdmin, saveDrop } from "@/lib/plus-admin";

/**
 * §25 — edição e exclusão de um Drop. Id imutável; ao excluir, o histórico
 * de resgates do Drop sai junto (a licença permanente já gravada na
 * biblioteca do usuário permanece — §25).
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
  const ref = db.collection("drops").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Drop não encontrado." }, { status: 404 });
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

  const parsed = sanitizeDropInput(body?.item, {
    id,
    createdAt: typeof previous.createdAt === "string" ? previous.createdAt : undefined,
  });
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const drop = parsed.item;
  if (drop.id !== id) {
    return Response.json({ error: "O id do Drop não pode ser alterado." }, { status: 400 });
  }

  const saved = await saveDrop(drop);
  if (!saved) {
    return Response.json({ error: "Falha ao gravar o Drop." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Cliffhanger+",
    entity: "plusDrop",
    entityId: id,
    summary: `Atualizou o Drop “${drop.title}” (${drop.minPlan}, ${drop.permanence === "permanente" ? "permanente" : "temporário"}, ${drop.active ? "ativo" : "inativo"})`,
    before: previous,
    after: drop,
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
  const ref = db.collection("drops").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Drop não encontrado." }, { status: 404 });
  }
  const previous: Record<string, unknown> = {
    id: existing.id,
    ...((existing.data() ?? {}) as Record<string, unknown>),
  };
  const previousTitle = typeof previous.title === "string" ? previous.title : id;

  const claims = await deleteDrop(id);
  if (claims === null) {
    return Response.json({ error: "Falha ao excluir o Drop." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Cliffhanger+",
    entity: "plusDrop",
    entityId: id,
    summary: `Excluiu o Drop “${previousTitle}”${claims > 0 ? ` e ${claims} resgate(s)` : ""}`,
    before: previous,
  });

  return Response.json({ ok: true, claimsRemoved: claims });
}

/** Lista auxiliar usada pela página de resgates (mantém o gate num só lugar). */
export async function GET(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "plus.view");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const board = await listDropsAdmin();
    const item = board.items.find((drop) => drop.id === id);
    if (!item) return Response.json({ error: "Drop não encontrado." }, { status: 404 });
    return Response.json({
      item,
      claims: board.claims.filter((claim) => claim.dropId === id),
    });
  } catch {
    return Response.json({ error: "Falha ao ler o Drop." }, { status: 500 });
  }
}
