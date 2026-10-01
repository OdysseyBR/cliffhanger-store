import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Cliente da API do PagBank (Order API) — Etapa B do roadmap: pagamento no
 * ambiente de teste. Documentação: developer.pagbank.com.br (guia "Pedidos e
 * pagamentos"). O token de acesso é exclusivo do servidor e nunca é exposto
 * ao navegador. Ambiente definido por `PAGBANK_SANDBOX` (.env.example).
 */

/** Erro de comunicação com o gateway (mensagem pronta para o cliente). */
export class PagbankError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "PagbankError";
  }
}

/** Métodos de pagamento aceitos no checkout (§7.3). */
export type CheckoutPaymentMethod = "pix" | "credito" | "debito";

/** Status de cobrança que interessam ao fluxo (tabela de status do guia). */
export type ChargeStatus =
  | "WAITING"
  | "AUTHORIZED"
  | "PAID"
  | "IN_ANALYSIS"
  | "DECLINED"
  | "CANCELED"
  | string;

export interface PagbankLink {
  rel: string;
  href: string;
}

export interface PagbankCharge {
  id: string;
  status: ChargeStatus;
  paid_at?: string;
  amount?: { value: number; currency: string; summary?: { paid?: number } };
  payment_response?: { code?: string; message?: string };
  payment_method?: { type?: string };
  qr_code?: { id?: string; text?: string };
  links?: PagbankLink[];
}

export interface PagbankOrder {
  id: string;
  reference_id?: string;
  charges?: PagbankCharge[];
}

function accessToken(): string {
  const token = process.env.PAGBANK_TOKEN?.trim();
  return token ?? "";
}

/** Pagamento disponível apenas com token configurado. */
export function pagbankEnabled(): boolean {
  return accessToken().length > 0;
}

/** Base URL do ambiente — sandbox por padrão; produção só com flag explícita. */
export function pagbankBaseUrl(): string {
  return process.env.PAGBANK_SANDBOX === "false"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

/**
 * URL de notificação (webhook) — PagBank exige HTTPS; em desenvolvimento
 * local (`NEXT_PUBLIC_SITE_URL` em http://localhost) o webhook é omitido e a
 * confirmação acontece por polling (`GET /api/payment/status`).
 */
export function pagbankWebhookUrl(): string | null {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (!base.startsWith("https://")) return null;
  return `${base}/api/webhook/pagbank`;
}

interface ErrorBody {
  error_messages?: { description?: string; error?: string; parameter_name?: string }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = accessToken();
  if (!token) {
    throw new PagbankError("Pagamento indisponível — credenciais não configuradas.", 503);
  }

  let response: Response;
  try {
    response = await fetch(`${pagbankBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new PagbankError("Não foi possível falar com o PagBank agora. Tente novamente.", 502);
  }

  const text = await response.text();
  if (!response.ok) {
    let detail = "";
    try {
      const body = JSON.parse(text) as ErrorBody;
      const first = body.error_messages?.[0];
      detail = [first?.description, first?.error, first?.parameter_name]
        .filter(Boolean)
        .join(" — ");
    } catch {
      /* corpo não é JSON */
    }
    throw new PagbankError(
      detail
        ? `PagBank recusou a operação: ${detail}.`
        : "PagBank recusou a operação. Tente novamente.",
      response.status >= 500 ? 502 : 422,
    );
  }

  return JSON.parse(text) as T;
}

/** Cria um pedido no PagBank com as cobranças anexadas (PIX ou cartão). */
export function createPagbankOrder(payload: unknown): Promise<PagbankOrder> {
  return request<PagbankOrder>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Consulta um pedido no PagBank (usado pelo polling de status). */
export function getPagbankOrder(orderId: string): Promise<PagbankOrder> {
  return request<PagbankOrder>(`/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

/**
 * Confirma a autenticidade do webhook (guia "Confirmar autenticidade da
 * notificação"): header `x-authenticity-token` = SHA-256 hex de
 * `{token}-{payload}`. Comparação em tempo constante.
 */
export function verifyWebhookSignature(rawBody: string, received: string | null): boolean {
  const token = accessToken();
  if (!token || !received) return false;
  const expected = createHash("sha256").update(`${token}-${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
