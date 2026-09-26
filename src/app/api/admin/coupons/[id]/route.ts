import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeCoupon } from "@/lib/coupons";
import type { Coupon } from "@/lib/types";

/**
 * Edição/exclusão de um cupom pelo painel (Documento de Correção §12).
 * Params de rota são Promise nesta versão do Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Cupom não encontrado." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request);
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("coupons").doc(id.toUpperCase());
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  let raw: unknown;
  try {
    const body = (await request.json()) as { coupon?: unknown };
    raw = body?.coupon;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const coupon = sanitizeCoupon(raw);
  if (!coupon || coupon.code !== id.toUpperCase()) {
    return Response.json(
      { error: "Dados do cupom inválidos (o código não pode ser alterado)." },
      { status: 400 },
    );
  }

  const previous = existing.data() as Partial<Coupon> | undefined;
  const record: Coupon = {
    ...coupon,
    usedCount:
      typeof previous?.usedCount === "number" && previous.usedCount >= 0
        ? previous.usedCount
        : 0,
    createdAt:
      typeof previous?.createdAt === "string" && previous.createdAt
        ? previous.createdAt
        : coupon.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(plainDoc(record));
  return Response.json({ ok: true, coupon: { id: record.code, ...record } });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(_request);
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("coupons").doc(id.toUpperCase());
  if (!(await ref.get()).exists) return notFound();

  await ref.delete();
  return Response.json({ ok: true });
}
