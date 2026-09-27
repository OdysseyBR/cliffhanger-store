import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeBenefitInput } from "@/lib/marketing-fields";
import type { ClubBenefit } from "@/lib/types";

/** §12/§18 — edição e exclusão de benefício do clube (id imutável). */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "club.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("clubBenefits").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Benefício não encontrado." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<ClubBenefit>) } as ClubBenefit;

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeBenefitInput(body?.item, previous);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const benefit = parsed.item;
  if (benefit.id !== id) {
    return Response.json({ error: "O id do benefício não pode ser alterado." }, { status: 400 });
  }

  if (benefit.kind === "cupom" && benefit.couponCode) {
    const coupon = await db.collection("coupons").doc(benefit.couponCode).get();
    if (!coupon.exists) {
      return Response.json(
        { error: `Cupom ${benefit.couponCode} não existe — o resgate entregaria o vazio.` },
        { status: 400 },
      );
    }
  }

  try {
    await ref.set(plainDoc(benefit));
  } catch {
    return Response.json({ error: "Falha ao gravar o benefício." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Cliffhanger Club",
    entity: "benefit",
    entityId: id,
    summary: `Atualizou o benefício “${benefit.title}” (${benefit.cost} pontos)`,
    before: previous,
    after: benefit,
  });

  return Response.json({ ok: true, item: benefit });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "club.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("clubBenefits").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Benefício não encontrado." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<ClubBenefit>) } as ClubBenefit;

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir o benefício." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Cliffhanger Club",
    entity: "benefit",
    entityId: id,
    summary: `Excluiu o benefício “${previous.title}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
