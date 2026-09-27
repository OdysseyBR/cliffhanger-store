import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizePromotionInput } from "@/lib/marketing-fields";
import { missingLinks } from "@/lib/promotion-admin";
import type { Promotion } from "@/lib/types";

/**
 * §12/§16 — Promoções: leitura das campanhas e criação (comercial,
 * marketing e administrador). Cupom, coleção e banner vinculados são
 * validados contra as coleções reais; a fase (ativa/agendada/expirada) é
 * derivada no painel e na loja.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "promotions.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("promotions").get();
    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<Promotion>) }) as Promotion)
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler as promoções." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "promotions.edit");
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

  const parsed = sanitizePromotionInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const promotion = parsed.item;

  const problems = await missingLinks(db, promotion);
  if (problems) return Response.json({ error: problems }, { status: 400 });

  const exists = await db.collection("promotions").doc(promotion.id).get();
  if (exists.exists) {
    return Response.json({ error: "Já existe uma promoção com este identificador." }, { status: 409 });
  }

  try {
    await db.collection("promotions").doc(promotion.id).set(plainDoc(promotion));
  } catch {
    return Response.json({ error: "Falha ao gravar a promoção." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Promoções",
    entity: "promotion",
    entityId: promotion.id,
    summary: `Criou a campanha “${promotion.title}” (${promotion.productIds.length} produto(s))`,
    after: promotion,
  });

  return Response.json({ ok: true, item: promotion }, { status: 201 });
}
