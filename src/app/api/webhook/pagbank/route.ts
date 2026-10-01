import { confirmPayment } from "@/lib/payment";
import { verifyWebhookSignature } from "@/lib/pagbank";

/**
 * Etapa B — webhook do PagBank (notificações de mudança de status).
 * Autenticidade: header `x-authenticity-token` = SHA-256 hex de
 * `{token}-{payload}` (guia "Confirmar autenticidade da notificação").
 * Payload de eventos pós-transacionais chega em formato form-encoded — é
 * apenas reconhecido (200), sem transição de status.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-authenticity-token");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ ok: false, error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: {
    id?: string;
    reference_id?: string;
    charges?: {
      id?: string;
      status?: string;
      paid_at?: string;
      payment_method?: { type?: string };
    }[];
    status?: string;
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    // Evento pós-transacional (form-encoded) — apenas reconhece.
    return Response.json({ ok: true, ignored: true });
  }

  const orderId = payload.reference_id;
  const charge = payload.charges?.[0];
  const chargeStatus = String(charge?.status ?? payload.status ?? "");

  if (!orderId || !charge) {
    return Response.json({ ok: true, ignored: true });
  }

  if (chargeStatus === "PAID" || chargeStatus === "AUTHORIZED") {
    const pmType = String(charge.payment_method?.type ?? "").toUpperCase();
    const method =
      pmType === "CREDIT_CARD" ? "credito" : pmType === "DEBIT_CARD" ? "debito" : "pix";
    try {
      await confirmPayment(orderId, {
        pagbankOrderId: typeof payload.id === "string" ? payload.id : undefined,
        chargeId: charge.id,
        method,
        chargeStatus,
        paidAt: charge.paid_at,
      });
    } catch (error) {
      // Erro transitório → 500 para o PagBank reenviar a notificação.
      console.warn("[webhook/pagbank] falha ao confirmar:", error);
      return Response.json({ ok: false }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
