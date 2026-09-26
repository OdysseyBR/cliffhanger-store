import { evaluateCoupon, normalizeCouponCode } from "@/lib/coupons";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Coupon } from "@/lib/types";

/**
 * Valida um cupom no checkout (Documento de Correção §17) — pública,
 * somente leitura: devolve o desconto para o cliente exibir; o servidor
 * do pedido revalida antes de conceder.
 */

export async function POST(request: Request) {
  let payload: { code?: string; subtotal?: number };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const code = normalizeCouponCode(payload.code ?? "");
  if (!code) {
    return Response.json({ error: "Informe o código do cupom." }, { status: 400 });
  }
  const subtotal = Number(payload.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return Response.json({ error: "Subtotal inválido." }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Cupons indisponíveis neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("coupons").doc(code).get();
    if (!snap.exists) {
      return Response.json({ error: "Cupom não encontrado." }, { status: 404 });
    }
    const coupon = { id: snap.id, ...snap.data() } as Coupon & { id: string };
    const evaluation = evaluateCoupon(coupon, subtotal);
    if (!evaluation.ok) {
      return Response.json({ error: evaluation.error ?? "Cupom inválido." }, { status: 400 });
    }
    return Response.json({
      ok: true,
      discount: evaluation.discount,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
    });
  } catch {
    return Response.json({ error: "Falha ao validar o cupom." }, { status: 500 });
  }
}
