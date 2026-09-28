/**
 * §6/§7/§9/§10/§11 — dados da conta do usuário (coleção `customers/{uid}`).
 * Endereços, métodos de pagamento (só referências — a loja nunca guarda
 * número completo de cartão), preferências de notificação, privacidade e
 * preferências de experiência. Escrita sempre pelo servidor (`/api/account/*`
 * com a sessão do dono); leitura tolerante a documentos antigos.
 */

export interface CustomerAddress {
  id: string;
  label: "Casa" | "Trabalho" | "Outro";
  recipient: string;
  cep: string;
  state: string;
  city: string;
  district: string;
  street: string;
  number: string;
  complement?: string;
  reference?: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Referência segura de cartão (bandeira + 4 dígitos + validade). */
export interface PaymentMethodRef {
  id: string;
  brand: "visa" | "master" | "elo" | "hiper" | "amex" | "outra";
  last4: string;
  expMonth: number;
  expYear: number;
  holderName?: string;
  isDefault: boolean;
  createdAt: string;
}

export type NotifyChannel = "email" | "push" | "inApp";

export type NotifyCategory = "store" | "launches" | "wishlist" | "library" | "plus" | "orders";

export const NOTIFY_CATEGORIES: Array<{ key: NotifyCategory; label: string; hint: string }> = [
  { key: "store", label: "Loja", hint: "Promoções, ofertas, novidades e reposições." },
  { key: "launches", label: "Lançamentos", hint: "Novidades, pré-vendas e edições especiais." },
  { key: "wishlist", label: "Wishlist", hint: "Volta ao estoque, preço, promoção e esgotando." },
  { key: "library", label: "Biblioteca", hint: "E-books, audiobooks e conteúdos extras." },
  { key: "plus", label: "Cliffhanger+", hint: "Drops, benefícios, caixas e renovação." },
  { key: "orders", label: "Pedidos", hint: "Pagamento, envio, rastreio e entrega." },
];

export type NotifyPrefs = Record<NotifyCategory, Record<NotifyChannel, boolean>>;

export function defaultNotifyPrefs(): NotifyPrefs {
  const on = { email: true, push: true, inApp: true };
  return {
    store: { ...on },
    launches: { ...on },
    wishlist: { ...on },
    library: { ...on },
    plus: { ...on },
    orders: { email: true, push: false, inApp: true },
  };
}

export interface AccountPrefs {
  appearance: "" | "claro";
  readerFont: "pequeno" | "padrao" | "grande";
  audioSpeed: number;
}

export const AUDIO_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function defaultAccountPrefs(): AccountPrefs {
  return { appearance: "", readerFont: "padrao", audioSpeed: 1 };
}

/** §14 — item da Minha Coleção (derivado de biblioteca + pedidos). */
export interface CollectionEntry {
  productId: string;
  title: string;
  digital: boolean;
  kind: string;
  universeId?: string;
  universeName?: string;
  workId?: string;
  acquiredAt: string;
  orderId?: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export type FieldParse<T> = { ok: true; item: T } | { ok: false; error: string };

const ADDRESS_LABELS = ["Casa", "Trabalho", "Outro"] as const;

export function sanitizeAddress(raw: unknown, existing: CustomerAddress | null): FieldParse<CustomerAddress> {
  const input = (raw ?? null) as Partial<CustomerAddress> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados do endereço inválidos." };
  }

  if (!ADDRESS_LABELS.includes(input.label as (typeof ADDRESS_LABELS)[number])) {
    return { ok: false, error: "Identificação inválida (Casa, Trabalho ou Outro)." };
  }

  const recipient = str(input.recipient);
  if (recipient.length < 2) return { ok: false, error: "Informe o nome do destinatário." };

  const cep = digits(str(input.cep));
  if (cep.length !== 8) return { ok: false, error: "CEP inválido (8 dígitos)." };

  const state = str(input.state).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) return { ok: false, error: "UF inválida (2 letras)." };

  const city = str(input.city);
  const district = str(input.district);
  const street = str(input.street);
  const number = str(input.number);
  if (!city || !district || !street || !number) {
    return { ok: false, error: "Cidade, bairro, rua e número são obrigatórios." };
  }

  const phone = digits(str(input.phone));
  if (phone && (phone.length < 8 || phone.length > 15)) {
    return { ok: false, error: "Telefone inválido." };
  }

  const now = new Date().toISOString();
  return {
    ok: true,
    item: {
      id: existing?.id ?? `addr-${Date.now().toString(36)}`,
      label: input.label as (typeof ADDRESS_LABELS)[number],
      recipient,
      cep,
      state,
      city,
      district,
      street,
      number,
      complement: str(input.complement) || undefined,
      reference: str(input.reference) || undefined,
      phone: phone || undefined,
      isDefault: existing?.isDefault ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}

const BRANDS = ["visa", "master", "elo", "hiper", "amex", "outra"] as const;

export function sanitizePaymentMethod(
  raw: unknown,
  existing: PaymentMethodRef | null,
): FieldParse<PaymentMethodRef> {
  const input = (raw ?? null) as Partial<PaymentMethodRef> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados do método inválidos." };
  }

  if (!BRANDS.includes(input.brand as (typeof BRANDS)[number])) {
    return { ok: false, error: "Bandeira inválida." };
  }

  const last4 = digits(str(input.last4));
  if (!/^\d{4}$/.test(last4)) {
    return { ok: false, error: "Informe só os 4 últimos dígitos — nunca o número completo." };
  }

  const expMonth = Number(input.expMonth);
  const expYear = Number(input.expYear);
  const now = new Date();
  const currentRef = now.getFullYear() * 12 + now.getMonth();
  const cardRef = expYear * 12 + (expMonth - 1);
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12 || !Number.isInteger(expYear)) {
    return { ok: false, error: "Validade inválida." };
  }
  if (cardRef < currentRef) {
    return { ok: false, error: "Cartão vencido — confira a validade." };
  }

  const holderName = str(input.holderName);
  const stamp = new Date().toISOString();
  return {
    ok: true,
    item: {
      id: existing?.id ?? `pay-${Date.now().toString(36)}`,
      brand: input.brand as (typeof BRANDS)[number],
      last4,
      expMonth,
      expYear,
      holderName: holderName || undefined,
      isDefault: existing?.isDefault ?? false,
      createdAt: existing?.createdAt ?? stamp,
    },
  };
}

export function sanitizeNotifyPrefs(raw: unknown): FieldParse<NotifyPrefs> {
  const input = (raw ?? null) as Partial<Record<NotifyCategory, Partial<Record<NotifyChannel, unknown>>>> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Preferências inválidas." };
  }
  const prefs = defaultNotifyPrefs();
  for (const { key } of NOTIFY_CATEGORIES) {
    const category = input[key];
    if (!category || typeof category !== "object") continue;
    for (const channel of ["email", "push", "inApp"] as const) {
      if (typeof category[channel] === "boolean") prefs[key][channel] = category[channel];
    }
  }
  return { ok: true, item: prefs };
}

export function sanitizeAccountPrefs(raw: unknown): FieldParse<AccountPrefs> {  const input = (raw ?? null) as Partial<AccountPrefs> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Preferências inválidas." };
  }
  const appearance = input.appearance === "claro" ? "claro" : "";
  const readerFont =
    input.readerFont === "pequeno" || input.readerFont === "grande" ? input.readerFont : "padrao";
  const audioSpeed = AUDIO_SPEEDS.includes(Number(input.audioSpeed)) ? Number(input.audioSpeed) : 1;
  return { ok: true, item: { appearance, readerFont, audioSpeed } };
}
