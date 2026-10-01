import { PaymentError, getPaymentStatus } from "@/lib/payment";

/**
 * Etapa B — status do pagamento do pedido. Usado pelo checkout em polling
 * (fallback do webhook quando não há URL pública, ex.: desenvolvimento
 * local). Quando o PagBank já confirmou, esta rota também conclui a
 * confirmação automática do pedido (§7.4).
 */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId") ?? "";
  if (!orderId) {
    return Response.json(
      { ok: false, error: "Pedido não informado." },
      { status: 400 },
    );
  }

  try {
    const outcome = await getPaymentStatus(orderId);
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    if (error instanceof PaymentError) {
      return Response.json(
        { ok: false, error: error.message },
        { status: error.httpStatus },
      );
    }
    console.warn("[payment/status] falha inesperada:", error);
    return Response.json(
      { ok: false, error: "Não foi possível consultar o status agora." },
      { status: 500 },
    );
  }
}
