import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeCoupon } from "@/lib/coupons";
import type { Coupon } from "@/lib/types";

/**
 * Módulo Cupons do painel (Documento de Correção §12; §17 — checkout).
 * Papéis da §13: leitura exige `coupons.view`, escrita `coupons.edit`.
 * Coleção `coupons`, id = código normalizado.
 */

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "coupons.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ coupons: [] });

  try {
    const snap = await db.collection("coupons").orderBy("code").get();
    const coupons = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Coupon & { id: string });
    return Response.json({ coupons });
  } catch {
    return Response.json({ error: "Falha ao ler os cupons." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "coupons.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    const body = (await request.json()) as { coupon?: unknown };
    raw = body?.coupon;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const coupon = sanitizeCoupon(raw);
  if (!coupon) {
    return Response.json(
      {
        error:
          "Dados do cupom inválidos (código de 3-24 caracteres, tipo percent/fixed e valor positivo).",
      },
      { status: 400 },
    );
  }

  const ref = db.collection("coupons").doc(coupon.code);
  if ((await ref.get()).exists) {
    return Response.json(
      { error: `Já existe o cupom ${coupon.code}.` },
      { status: 409 },
    );
  }

  await ref.set(plainDoc(coupon));

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Cupons",
    entity: "coupon",
    entityId: coupon.code,
    summary: `Criou o cupom ${coupon.code} (${coupon.type === "percent" ? `${coupon.value}%` : `R$ ${coupon.value}`})`,
    after: coupon,
  });

  return Response.json({ ok: true, coupon: { id: coupon.code, ...coupon } });
}
