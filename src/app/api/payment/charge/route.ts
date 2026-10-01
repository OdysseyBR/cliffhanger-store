import { PaymentError, createCharge, type ChargeOutcome } from "@/lib/payment";
import type { CheckoutPaymentMethod } from "@/lib/pagbank";

/**
 * Etapa B — cria a cobrança PagBank do pedido (Doc Mestre §7.4).
 * PIX → QR Code + copia-e-cola; cartão → cobrança em um passo com o cartão
 * criptografado no navegador (o criptograma não é persistido).
 */
export async function POST(request: Request) {
  let body: {
    orderId?: string;
    method?: string;
    card?: {
      encrypted?: string;
      expMonth?: string;
      expYear?: string;
      installments?: number;
      holder?: string;
    };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Corpo inválido." }, { status: 400 });
  }

  const method = body.method as CheckoutPaymentMethod | undefined;
  if (!body.orderId || !method || !["pix", "credito", "debito"].includes(method)) {
    return Response.json(
      { ok: false, error: "Pedido ou método de pagamento inválido." },
      { status: 400 },
    );
  }

  try {
    const outcome: ChargeOutcome = await createCharge({
      orderId: body.orderId,
      method,
      ...(body.card
        ? {
            card: {
              encrypted: body.card.encrypted ?? "",
              expMonth: body.card.expMonth ?? "",
              expYear: body.card.expYear ?? "",
              ...(body.card.installments ? { installments: body.card.installments } : {}),
              ...(body.card.holder ? { holder: body.card.holder } : {}),
            },
          }
        : {}),
    });
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    if (error instanceof PaymentError) {
      return Response.json(
        { ok: false, error: error.message },
        { status: error.httpStatus },
      );
    }
    console.warn("[payment/charge] falha inesperada:", error);
    return Response.json(
      { ok: false, error: "Não foi possível processar o pagamento agora." },
      { status: 500 },
    );
  }
}
