import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import type { Review } from "@/lib/types";

/**
 * §12/§19 — moderação de avaliação: aprovar, rejeitar ou excluir
 * (atendimento e administrador). Exclusão exige confirmação do painel;
 * aprovação/rejeição preservam o histórico com a data da moderação.
 */

type RouteCtx = { params: Promise<{ id: string }> };

const STATUSES = ["pendente", "aprovada", "rejeitada"] as const;

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "reviews.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("reviews").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<Review>) } as Review;

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!STATUSES.includes(body?.status as Review["status"])) {
    return Response.json({ error: "Status inválido (pendente, aprovada ou rejeitada)." }, { status: 400 });
  }
  const status = body.status as Review["status"];

  if (status === previous.status) {
    return Response.json({ ok: true, changed: false, item: previous });
  }

  const item: Review = { ...previous, status, updatedAt: new Date().toISOString() };
  try {
    await ref.set(plainDoc(item));
  } catch {
    return Response.json({ error: "Falha ao moderar a avaliação." }, { status: 500 });
  }

  const verbs = { pendente: "Devolveu para pendência", aprovada: "Aprovou", rejeitada: "Rejeitou" } as const;
  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Avaliações",
    entity: "review",
    entityId: id,
    summary: `${verbs[status]} a avaliação de “${previous.authorName}” (${previous.rating}★ em ${previous.productTitle ?? previous.productId})`,
    before: { status: previous.status },
    after: { status },
  });

  return Response.json({ ok: true, changed: true, item });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "reviews.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("reviews").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<Review>) } as Review;

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir a avaliação." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Avaliações",
    entity: "review",
    entityId: id,
    summary: `Excluiu a avaliação de “${previous.authorName}” (${previous.rating}★ em ${previous.productTitle ?? previous.productId})`,
    before: previous,
  });

  return Response.json({ ok: true });
}
