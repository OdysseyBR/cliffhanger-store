import { getProducts } from "@/lib/data";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { grantLibraryItems } from "@/lib/library";
import { normalizeStatus } from "@/lib/order-status";
import {
  PagbankError,
  createPagbankOrder,
  getPagbankOrder,
  pagbankEnabled,
  pagbankWebhookUrl,
  type CheckoutPaymentMethod,
  type PagbankCharge,
  type PagbankOrder,
} from "@/lib/pagbank";
import type { OrderItem, OrderStatus } from "@/lib/types";

/**
 * Etapa B — fluxo de pagamento conforme Doc Mestre §7.4:
 * Pedido criado → Cobrança → Pagamento → Confirmação automática → Liberação
 * digital. A criação do pedido continua em `/api/orders`; a cobrança PagBank
 * acontece em `/api/payment/charge`, e a confirmação (webhook ou polling)
 * transiciona o status e libera os itens digitais na biblioteca (§8).
 */

/** Dados de pagamento gravados no documento do pedido (somente servidor). */
interface OrderPaymentDoc {
  provider: "pagbank";
  pagbankOrderId: string;
  chargeId: string;
  method: CheckoutPaymentMethod;
  status: string;
  message?: string;
  qrText?: string;
  qrImage?: string;
  expiresAt?: string;
  confirmedAt?: string;
  updatedAt: string;
}

/** Erro de negócio com status HTTP pronto para a rota. */
export class PaymentError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export interface ChargeCardInput {
  encrypted: string;
  expMonth: string;
  expYear: string;
  installments?: number;
  holder?: string;
}

export interface ChargeInput {
  orderId: string;
  method: CheckoutPaymentMethod;
  card?: ChargeCardInput;
}

export interface ChargeOutcome {
  status: OrderStatus;
  message?: string;
  pix?: { image: string; text: string; expiresAt: string };
}

export interface StatusOutcome {
  status: OrderStatus;
  message?: string;
}

type OrderDoc = Record<string, unknown>;

const PIX_EXPIRY_MS = 30 * 60 * 1000;

/** Mapeia status da cobrança PagBank para status do pedido (§7.6). */
function chargeSucceeded(status: string | undefined): boolean {
  return status === "PAID" || status === "AUTHORIZED";
}

function digits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function customerPhone(phone: unknown): { country: string; area: string; number: string; type: string }[] {
  const d = digits(phone);
  if (d.length < 10 || d.length > 11) return [];
  return [{ country: "55", area: d.slice(0, 2), number: d.slice(2), type: "MOBILE" }];
}

async function readOrder(orderId: string): Promise<{ id: string; data: OrderDoc }> {
  const db = getAdminDb();
  if (!db) throw new PaymentError("Firestore não configurado neste ambiente.", 503);
  if (!orderId) throw new PaymentError("Pedido não informado.", 400);
  const snap = await db.collection("orders").doc(orderId).get();
  if (!snap.exists) throw new PaymentError("Pedido não encontrado.", 404);
  return { id: snap.id, data: snap.data() as OrderDoc };
}

/** Monta o payload do pedido PagBank a partir do nosso pedido persistido. */
function buildPagbankPayload(orderId: string, data: OrderDoc, method: CheckoutPaymentMethod): unknown {
  const items = (Array.isArray(data.items) ? data.items : []) as OrderItem[];
  const address = (data.address ?? null) as Record<string, string> | null;
  const customer = (data.customer ?? null) as { name?: string; phone?: string } | null;
  const taxId = digits(data.taxId);
  const name = (customer?.name ?? "").trim() || String(data.email ?? "Cliente");
  const email = String(data.email ?? "").trim();
  const totalCents = Math.round(Number(data.total ?? 0) * 100);
  const hasPhysical = items.some((item) => !item.digital);
  const webhook = pagbankWebhookUrl();

  const pbItems = items.map((item) => ({
    reference_id: item.productId,
    name: item.title.slice(0, 80),
    quantity: item.qty,
    unit_amount: Math.max(1, Math.round(item.price * 100)),
  }));

  const shipping =
    hasPhysical && address?.cep && address?.street
      ? {
          address: {
            street: address.street,
            number: address.number ?? "s/n",
            complement: address.complement ?? undefined,
            locality: address.neighborhood ?? "",
            city: address.city ?? "",
            region_code: address.state ?? "",
            country: "BRA",
            postal_code: digits(address.cep),
          },
        }
      : undefined;

  let paymentMethod: Record<string, unknown>;
  if (method === "pix") {
    paymentMethod = {
      type: "PIX",
      pix: { expiration_date: new Date(Date.now() + PIX_EXPIRY_MS).toISOString() },
    };
  } else {
    const card = (data.__card ?? null) as ChargeCardInput | null;
    const expMonth = Number(card?.expMonth);
    const expYear = Number(card?.expYear);
    const holder = {
      name: (card?.holder ?? name).trim().slice(0, 60) || name,
      ...(taxId ? { tax_id: taxId } : {}),
    };
    if (method === "credito") {
      paymentMethod = {
        type: "CREDIT_CARD",
        installments: Math.max(1, Math.min(6, Math.trunc(card?.installments ?? 1))),
        capture: true,
        soft_descriptor: "CLIFFHANGER STORE",
        card: {
          encrypted: card?.encrypted ?? "",
          exp_month: expMonth,
          exp_year: expYear,
          store: false,
          holder,
        },
      };
    } else {
      paymentMethod = {
        type: "DEBIT_CARD",
        card: {
          encrypted: card?.encrypted ?? "",
          exp_month: expMonth,
          exp_year: expYear,
          holder,
        },
        // Cartão de débito exige autenticação 3DS (API). No ambiente de teste
        // os valores sintéticos vêm da própria documentação PagBank (exemplo
        // "Criar/Pag 3DS — Validação Externa DEB"); em produção será
        // necessária a autenticação 3DS real do comprador (pendência da
        // troca para produção).
        authentication_method: {
          type: "THREEDS",
          cavv: "BwABBylVaQAAAAFwllVpAAAAAAA=",
          xid: "BwABBylVaQAAAAFwllVpAAAAAAA=",
          eci: "05",
          version: "2.1.0",
          dstrans_id: "DIR_SERVER_TID",
        },
      };
    }
  }

  return {
    reference_id: orderId,
    customer: {
      name,
      email,
      tax_id: taxId,
      ...(customerPhone(customer?.phone).length
        ? { phones: customerPhone(customer?.phone) }
        : {}),
    },
    items: pbItems,
    ...(shipping ? { shipping } : {}),
    ...(webhook ? { notification_urls: [webhook] } : {}),
    charges: [
      {
        reference_id: String(data.code ?? orderId),
        description: `Pedido ${String(data.code ?? orderId)} — Cliffhanger Store`,
        amount: { value: totalCents, currency: "BRL" },
        payment_method: paymentMethod,
      },
    ],
  };
}

async function persistPayment(
  orderId: string,
  payment: OrderPaymentDoc,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new PaymentError("Firestore não configurado neste ambiente.", 503);
  await db
    .collection("orders")
    .doc(orderId)
    .set(plainDoc({ payment }), { merge: true });
}

function qrImageFrom(charge: PagbankCharge): Promise<string | null> {
  const link = charge.links?.find((l) => l.rel === "QRCODE.PNG")?.href;
  if (!link) return Promise.resolve(null);
  return (async () => {
    try {
      const res = await fetch(link, { cache: "no-store" });
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch {
      return null;
    }
  })();
}

/**
 * Confirma o pagamento do pedido (idempotente): `aguardando_pagamento` →
 * `pagamento_aprovado`, grava os dados da cobrança e libera os itens
 * digitais na biblioteca do comprador logado (§8 — visitante recebe o
 * espelho local no cliente).
 */
export async function confirmPayment(
  orderId: string,
  info: {
    pagbankOrderId?: string;
    chargeId?: string;
    method?: CheckoutPaymentMethod;
    chargeStatus: string;
    paidAt?: string;
  },
): Promise<{ status: OrderStatus; changed: boolean; userId?: string }> {
  const db = getAdminDb();
  if (!db) throw new PaymentError("Firestore não configurado neste ambiente.", 503);
  const ref = db.collection("orders").doc(orderId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new PaymentError("Pedido não encontrado.", 404);
    const data = snap.data() as OrderDoc;
    const current = normalizeStatus(data.status);
    const userId = typeof data.userId === "string" && data.userId ? data.userId : undefined;
    const existing = (data.payment ?? null) as OrderPaymentDoc | null;
    const payment: OrderPaymentDoc = {
      // dados anteriores (ex.: QR gerado) primeiro; os novos sobrescrevem
      ...(existing ?? {}),
      provider: "pagbank",
      pagbankOrderId: info.pagbankOrderId || existing?.pagbankOrderId || "",
      chargeId: info.chargeId || existing?.chargeId || "",
      method: info.method ?? existing?.method ?? "pix",
      status: info.chargeStatus,
      updatedAt: new Date().toISOString(),
      ...(current === "aguardando_pagamento" ? { confirmedAt: new Date().toISOString() } : {}),
    };
    if (current !== "aguardando_pagamento") {
      return { status: current, changed: false, userId, items: [] as OrderItem[] };
    }
    tx.update(
      ref,
      plainDoc({
        status: "pagamento_aprovado",
        updatedAt: payment.updatedAt,
        payment,
      }),
    );
    return {
      status: "pagamento_aprovado" as OrderStatus,
      changed: true,
      userId,
      items: (Array.isArray(data.items) ? data.items : []) as OrderItem[],
    };
  });

  // Liberação digital (§7.4) — só após a transição confirmada.
  if (result.changed && result.userId) {
    try {
      const products = await getProducts();
      await grantLibraryItems(result.userId, result.items, products, orderId);
    } catch (error) {
      console.warn("[payment] falha ao liberar itens na biblioteca:", error);
    }
  }

  return { status: result.status, changed: result.changed, userId: result.userId };
}

/**
 * Cria (ou reaproveita) a cobrança PagBank do pedido.
 * PIX → devolve QR Code + copia-e-cola. Cartão → cobra e devolve o resultado.
 */
export async function createCharge(input: ChargeInput): Promise<ChargeOutcome> {
  if (!pagbankEnabled()) {
    throw new PaymentError("Pagamento indisponível — tente novamente mais tarde.", 503);
  }

  const { id: orderId, data } = await readOrder(input.orderId);
  const current = normalizeStatus(data.status);
  if (current !== "aguardando_pagamento") {
    throw new PaymentError(
      current === "cancelado"
        ? "Este pedido foi cancelado."
        : "Este pedido já está pago.",
      409,
    );
  }

  const taxId = digits(data.taxId);
  if (taxId.length !== 11 && taxId.length !== 14) {
    throw new PaymentError(
      "CPF/CNPJ não informado — volte ao passo Dados e preencha o documento.",
      400,
    );
  }

  const payment = (data.payment ?? null) as OrderPaymentDoc | null;

  if (input.method === "pix") {
    // Reaproveita a cobrança PIX ativa (evita QR duplicado para o mesmo pedido).
    if (
      payment?.provider === "pagbank" &&
      payment.status === "WAITING" &&
      payment.qrText &&
      payment.qrImage &&
      payment.expiresAt &&
      new Date(payment.expiresAt).getTime() > Date.now()
    ) {
      return {
        status: "aguardando_pagamento",
        pix: {
          image: payment.qrImage,
          text: payment.qrText,
          expiresAt: payment.expiresAt,
        },
      };
    }
  } else {
    if (!input.card?.encrypted) {
      throw new PaymentError("Dados do cartão ausentes.", 400);
    }
    // Cobrança anterior já aprovada — não cobra duas vezes.
    if (payment?.status && chargeSucceeded(payment.status)) {
      throw new PaymentError("Este pedido já está pago.", 409);
    }
  }

  // O cartão criptografado viaja no payload de criação, não é persistido.
  const payload = buildPagbankPayload(orderId, { ...data, __card: input.card ?? null }, input.method);

  let pbOrder: PagbankOrder;
  try {
    pbOrder = await createPagbankOrder(payload);
  } catch (error) {
    if (error instanceof PagbankError) {
      throw new PaymentError(error.message, error.httpStatus >= 500 ? 503 : 422);
    }
    throw error;
  }

  const charge = pbOrder.charges?.[0];
  if (!charge?.id) {
    throw new PaymentError("PagBank não retornou a cobrança. Tente novamente.", 502);
  }

  const base: OrderPaymentDoc = {
    provider: "pagbank",
    pagbankOrderId: pbOrder.id,
    chargeId: charge.id,
    method: input.method,
    status: String(charge.status ?? "WAITING"),
    updatedAt: new Date().toISOString(),
  };

  if (input.method === "pix") {
    const text = charge.qr_code?.text ?? "";
    const image = await qrImageFrom(charge);
    const expiresAt = new Date(Date.now() + PIX_EXPIRY_MS).toISOString();
    if (!text || !image) {
      throw new PaymentError("Não foi possível gerar o QR Code. Tente novamente.", 502);
    }
    await persistPayment(orderId, { ...base, qrText: text, qrImage: image, expiresAt });
    return {
      status: "aguardando_pagamento",
      pix: { image, text, expiresAt },
    };
  }

  // Cartão — resultado imediato.
  const chargeStatus = String(charge.status ?? "");
  if (chargeSucceeded(chargeStatus)) {
    await confirmPayment(orderId, {
      pagbankOrderId: pbOrder.id,
      chargeId: charge.id,
      method: input.method,
      chargeStatus,
      paidAt: charge.paid_at,
    });
    return { status: "pagamento_aprovado" };
  }

  await persistPayment(orderId, {
    ...base,
    message: charge.payment_response?.message,
  });

  if (chargeStatus === "DECLINED") {
    throw new PaymentError(
      charge.payment_response?.message
        ? `Pagamento recusado: ${charge.payment_response.message}. Confira os dados ou use outro cartão.`
        : "Pagamento recusado. Confira os dados do cartão ou use outro cartão.",
      422,
    );
  }

  return {
    status: "aguardando_pagamento",
    message: "Pagamento em análise — o status é atualizado automaticamente.",
  };
}

/**
 * Status do pagamento do pedido. Quando a cobrança PagBank já foi paga mas o
 * pedido ainda está aguardando (webhook indisponível em desenvolvimento),
 * confirma aqui — é o fallback de polling do checkout.
 */
export async function getPaymentStatus(orderId: string): Promise<StatusOutcome> {
  const { id, data } = await readOrder(orderId);
  const current = normalizeStatus(data.status);
  if (current !== "aguardando_pagamento") return { status: current };

  const payment = (data.payment ?? null) as OrderPaymentDoc | null;
  if (payment?.provider !== "pagbank" || !payment.pagbankOrderId) {
    return { status: current, message: "Aguardando a geração da cobrança." };
  }

  let pbOrder: PagbankOrder;
  try {
    pbOrder = await getPagbankOrder(payment.pagbankOrderId);
  } catch {
    // Gateway fora do ar — mantém o último estado conhecido.
    return { status: current, message: payment.message };
  }

  const charge = pbOrder.charges?.[0];
  const chargeStatus = String(charge?.status ?? payment.status ?? "");

  if (chargeSucceeded(chargeStatus)) {
    await confirmPayment(id, {
      pagbankOrderId: payment.pagbankOrderId,
      chargeId: charge?.id ?? payment.chargeId,
      method: payment.method,
      chargeStatus,
      paidAt: charge?.paid_at,
    });
    return { status: "pagamento_aprovado" };
  }

  if (chargeStatus === "DECLINED" || chargeStatus === "CANCELED") {
    const message = charge?.payment_response?.message ?? payment.message;
    await persistPayment(id, {
      ...payment,
      status: chargeStatus,
      message,
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);
    return { status: current, message };
  }

  return { status: current, message: payment.message };
}
