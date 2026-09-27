import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeBenefitInput } from "@/lib/marketing-fields";
import type { ClubBenefit, ClubMember } from "@/lib/types";

/**
 * §12/§18 — Cliffhanger Club: leitura de membros (pontos e nível) e
 * benefícios, e criação de benefícios (comercial, marketing e
 * administrador). Membros nascem do ajuste de pontos — sem movimento
 * manual, sem membro.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "club.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const [memberSnap, benefitSnap] = await Promise.all([
      db.collection("clubMembers").get(),
      db.collection("clubBenefits").get(),
    ]);
    const members = memberSnap.docs
      .map((doc) => ({ uid: doc.id, ...(doc.data() as Partial<ClubMember>) }) as ClubMember)
      .sort((a, b) => b.points - a.points);
    const benefits = benefitSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<ClubBenefit>) }) as ClubBenefit)
      .sort((a, b) => a.cost - b.cost);
    return Response.json({ members, benefits });
  } catch {
    return Response.json({ error: "Falha ao ler o clube." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "club.edit");
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

  const parsed = sanitizeBenefitInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const benefit = parsed.item;

  if (benefit.kind === "cupom" && benefit.couponCode) {
    const coupon = await db.collection("coupons").doc(benefit.couponCode).get();
    if (!coupon.exists) {
      return Response.json(
        { error: `Cupom ${benefit.couponCode} não existe — o resgate entregaria o vazio.` },
        { status: 400 },
      );
    }
  }

  const exists = await db.collection("clubBenefits").doc(benefit.id).get();
  if (exists.exists) {
    return Response.json({ error: "Já existe um benefício com este identificador." }, { status: 409 });
  }

  try {
    await db.collection("clubBenefits").doc(benefit.id).set(plainDoc(benefit));
  } catch {
    return Response.json({ error: "Falha ao gravar o benefício." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Cliffhanger Club",
    entity: "benefit",
    entityId: benefit.id,
    summary: `Criou o benefício “${benefit.title}” (${benefit.cost} pontos)`,
    after: benefit,
  });

  return Response.json({ ok: true, item: benefit }, { status: 201 });
}
