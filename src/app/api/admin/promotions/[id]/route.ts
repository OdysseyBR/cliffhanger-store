import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizePromotionInput } from "@/lib/marketing-fields";
import { missingLinks } from "@/lib/promotion-admin";
import type { Promotion } from "@/lib/types";

/**
 * §12/§16 — edição e exclusão de campanha. Id imutável; vínculos
 * revalidados; toda mudança vai para a auditoria (§13).
 */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "promotions.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("promotions").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Promoção não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<Promotion>) } as Promotion;

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizePromotionInput(body?.item, previous);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const promotion = parsed.item;
  if (promotion.id !== id) {
    return Response.json({ error: "O id da campanha não pode ser alterado." }, { status: 400 });
  }

  const problems = await missingLinks(db, promotion);
  if (problems) return Response.json({ error: problems }, { status: 400 });

  const changed = JSON.stringify({ ...previous, updatedAt: promotion.updatedAt }) !== JSON.stringify(promotion);
  if (!changed) return Response.json({ ok: true, changed: false, item: promotion });

  try {
    await ref.set(plainDoc(promotion));
  } catch {
    return Response.json({ error: "Falha ao gravar a promoção." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Promoções",
    entity: "promotion",
    entityId: id,
    summary: `Atualizou a campanha “${promotion.title}” (${promotion.productIds.length} produto(s))`,
    before: previous,
    after: promotion,
  });

  return Response.json({ ok: true, changed: true, item: promotion });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "promotions.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("promotions").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Promoção não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<Promotion>) } as Promotion;

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir a promoção." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Promoções",
    entity: "promotion",
    entityId: id,
    summary: `Excluiu a campanha “${previous.title}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
