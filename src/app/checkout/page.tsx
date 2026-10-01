"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { ProductArt } from "@/components/ProductArt";
import { formatPrice, isValidTaxId, maskTaxId } from "@/lib/format";
import { getClientAuth } from "@/lib/firebase";
import {
  FREE_SHIPPING_FROM,
  fallbackShippingPrice,
  type ShippingQuote,
} from "@/lib/shipping";
import type { Product } from "@/lib/types";

type Step = "dados" | "entrega" | "pagamento" | "revisao" | "pedido";

const steps: { key: Step; label: string }[] = [
  { key: "dados", label: "Dados" },
  { key: "entrega", label: "Entrega" },
  { key: "pagamento", label: "Pagamento" },
  { key: "revisao", label: "Revisão" },
  { key: "pedido", label: "Pedido" },
];

interface OrderResult {
  orderId: string;
  method: "pix" | "credito" | "debito";
  code: string;
  total: number;
  discount?: number;
  gift?: boolean;
  digitalItems: string[];
  status: "aguardando_pagamento" | "pagamento_aprovado";
  pix?: { image: string; text: string; expiresAt: string };
}

/* — SDK do PagBank: criptografia do cartão no navegador (Etapa B) — */

const PAGSEGURO_SDK_URL =
  "https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js";

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (data: {
        publicKey: string;
        holder: string;
        number: string;
        expMonth: string;
        expYear: string;
        securityCode: string;
      }) => {
        encryptedCard?: string;
        hasErrors?: boolean;
        errors?: { code: string; message: string }[];
      };
    };
  }
}

function loadPagSeguroSdk(): Promise<void> {
  if (window.PagSeguro) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-pagseguro]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar o SDK do PagBank.")),
      );
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAGSEGURO_SDK_URL;
    script.dataset.pagseguro = "true";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o SDK do PagBank."));
    document.body.appendChild(script);
    window.setTimeout(
      () => reject(new Error("Tempo esgotado ao carregar o SDK do PagBank.")),
      15000,
    );
  });
}

function encryptErrorLabel(code: string): string {
  switch (code) {
    case "INVALID_NUMBER":
      return "Número de cartão inválido.";
    case "INVALID_SECURITY_CODE":
      return "Código de segurança inválido.";
    case "INVALID_EXPIRATION_MONTH":
      return "Mês de validade inválido.";
    case "INVALID_EXPIRATION_YEAR":
      return "Ano de validade inválido.";
    default:
      return "Dados do cartão inválidos.";
  }
}

async function encryptCardData(input: {
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}): Promise<string> {
  await loadPagSeguroSdk();
  const publicKey = process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY ?? "";
  if (!publicKey) {
    throw new Error("Pagamento por cartão indisponível neste ambiente.");
  }
  const result = window.PagSeguro?.encryptCard({
    publicKey,
    ...input,
    // o campo exibido tem máscara (4x4) — o SDK exige apenas dígitos
    number: input.number.replace(/\D/g, ""),
    securityCode: input.securityCode.replace(/\D/g, ""),
  });
  if (!result || result.hasErrors || !result.encryptedCard) {
    const first = result?.errors?.[0];
    throw new Error(first ? encryptErrorLabel(first.code) : "Não foi possível criptografar o cartão.");
  }
  return result.encryptedCard;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CheckoutPage() {
  const { cart, clearCart, user, notify } = useStore();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [step, setStep] = useState<Step>("dados");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | null>(null);

  // dados — `null` = ainda não editado; o valor exibido é derivado da sessão
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const name = nameInput ?? user?.displayName ?? "";
  const email = emailInput ?? user?.email ?? "";
  const [phone, setPhone] = useState("");
  // entrega
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [shippingOption, setShippingOption] = useState<"standard" | "express">("standard");
  const [addressFilled, setAddressFilled] = useState(false);

  // §6 — endereço principal entra sozinho (dá para trocar na compra)
  useEffect(() => {
    if (!user || addressFilled) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/account/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { addresses?: import("@/lib/account-fields").CustomerAddress[] };
        const primary = (data.addresses ?? []).find((address) => address.isDefault);
        if (!primary) return;
        setCep(primary.cep);
        setStreet(primary.street);
        setNumber(primary.number);
        setComplement(primary.complement ?? "");
        setNeighborhood(primary.district);
        setCity(primary.city);
        setState(primary.state);
        setAddressFilled(true);
      } catch {
        /* segue manual */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  // frete — cotação por CEP (§17)
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // §24 — frete grátis do Cliffhanger+ (vem do servidor com a sessão)
  const [plusFree, setPlusFree] = useState(false);
  // pagamento
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credito" | "debito">("pix");
  // §7.3 — documento do comprador (exigido pela API do PagBank)
  const [taxId, setTaxId] = useState("");
  // cartão — criptografado no navegador pelo SDK do PagBank (nunca cru aqui)
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  // pedido já criado cuja cobrança foi recusada (nova tentativa sem duplicar)
  const [createdOrder, setCreatedOrder] = useState<OrderResult | null>(null);
  // mensagem do polling (ex.: recusa durante a espera)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  // cupom (§17)
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  // opção de presente (§17)
  const [giftOn, setGiftOn] = useState(false);
  const [giftTo, setGiftTo] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftWrap, setGiftWrap] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/products");
        const data = (await res.json()) as { products: Product[] };
        setProducts(data.products ?? []);
      } catch {
        setProducts([]);
      }
    })();
  }, []);

  const lines = cart
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((l): l is { item: { productId: string; qty: number }; product: Product } =>
      Boolean(l.product),
    );

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.item.qty, 0);
  // só itens FÍSICos contam para o frete (digitais não têm envio)
  const itemCount = lines
    .filter((l) => !l.product.digital)
    .reduce((sum, l) => sum + l.item.qty, 0);
  const hasPhysical = lines.some((l) => !l.product.digital);
  // limite do frete grátis vem da cotação (Configurações §12); constante de reserva
  const freeFrom = quote?.freeShippingFrom ?? FREE_SHIPPING_FROM;
  const freeShipping = subtotal >= freeFrom;
  const quotePrice = (option: "standard" | "express"): number =>
    quote?.options.find((o) => o.id === option)?.price ??
    fallbackShippingPrice(subtotal, option, freeFrom);
  const shipping = !hasPhysical ? 0 : quotePrice(shippingOption);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const total = subtotal - discount + shipping;

  // §17 — cotação por CEP: busca quando o CEP está completo; falha de rede
  // mantém a estimativa (o servidor recalcula na criação do pedido).
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!hasPhysical) {
          setQuote(null);
          setQuoteError(null);
          setPlusFree(false);
          return;
        }
        const digits = cep.replace(/\D/g, "");
        if (digits.length !== 8) {
          setQuote(null);
          setQuoteError(null);
          setPlusFree(false);
          return;
        }
        // §24 — envia a sessão para o servidor aplicar o frete grátis do +
        let token: string | null = null;
        try {
          token = (await getClientAuth()?.currentUser?.getIdToken()) ?? null;
        } catch {
          token = null;
        }
        if (controller.signal.aborted) return;
        try {
          const res = await fetch("/api/shipping", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ cep: digits, itemCount, subtotal }),
            signal: controller.signal,
          });
          const data = (await res.json()) as ShippingQuote & {
            ok?: boolean;
            error?: string;
            plusFree?: boolean;
          };
          if (!res.ok || !data.ok) throw new Error(data.error ?? "Falha na cotação.");
          setQuote(data);
          setPlusFree(data.plusFree === true);
          setQuoteError(null);
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          setQuote(null);
          setPlusFree(false);
          setQuoteError(
            err instanceof Error ? err.message : "Não foi possível calcular o frete.",
          );
        }
      })();
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cep, hasPhysical, itemCount, subtotal, user]);

  const goNext = (event: FormEvent) => {
    event.preventDefault();
    if (step === "dados" && !isValidTaxId(taxId)) {
      const message = "CPF/CNPJ inválido — confira os números digitados.";
      setError(message);
      notify(message, "error");
      return;
    }
    setError(null);
    const order = steps.findIndex((s) => s.key === step);
    setStep(steps[Math.min(order + 1, steps.length - 1)].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    // voltar da revisão para o pagamento preserva o pedido criado (permite
    // editar o cartão e tentar de novo sem duplicar o pedido); voltar além
    // disso (dados/entrega) pode mudar o conteúdo do pedido → descarta.
    const order = steps.findIndex((s) => s.key === step);
    const target = order > 0 ? steps[order - 1] : null;
    if (!target || target.key !== "pagamento") {
      setCreatedOrder(null);
      setPendingMessage(null);
    }
    if (target) setStep(target.key);
  };

  const chargeRequest = async (
    orderId: string,
    method: "pix" | "credito" | "debito",
    card?: {
      encrypted: string;
      expMonth: string;
      expYear: string;
      installments: number;
      holder: string;
    },
  ): Promise<
    | { ok: true; status: string; message?: string; pix?: OrderResult["pix"] }
    | { ok: false; error: string }
  > => {
    try {
      const res = await fetch("/api/payment/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, method, ...(card ? { card } : {}) }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        status?: string;
        message?: string;
        pix?: OrderResult["pix"];
      };
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error ?? "Não foi possível processar o pagamento." };
      }
      return {
        ok: true,
        status: data.status ?? "aguardando_pagamento",
        message: data.message,
        pix: data.pix,
      };
    } catch {
      return { ok: false, error: "Falha de rede ao processar o pagamento. Tente novamente." };
    }
  };

  /** §7.4 — confirmação: espelho local do visitante, carrinho limpo, tela final. */
  const approvedRef = useRef(false);
  const finishApproved = (order: OrderResult) => {
    try {
      const raw = window.localStorage.getItem("ch:library");
      const library: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      const merged = Array.from(new Set([...library, ...order.digitalItems]));
      window.localStorage.setItem("ch:library", JSON.stringify(merged));
    } catch {
      /* storage indisponível */
    }
    setCreatedOrder(null);
    setPendingMessage(null);
    clearCart();
    setResult({ ...order, status: "pagamento_aprovado", pix: undefined });
    setStep("pedido");
    if (!approvedRef.current) {
      approvedRef.current = true;
      notify("Pagamento aprovado!", "success");
    }
  };

  const validateCardFields = (): string | null => {
    const number = cardNumber.replace(/\D/g, "");
    if (number.length < 13 || number.length > 16) return "Número do cartão inválido.";
    const expiry = /^(\d{2})\/(\d{2})$/.exec(cardExp.trim());
    if (!expiry) return "Validade do cartão no formato MM/AA.";
    const month = Number(expiry[1]);
    if (month < 1 || month > 12) return "Mês de validade inválido.";
    const year = 2000 + Number(expiry[2]);
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      return "Cartão vencido — confira a validade.";
    }
    if (cardCvv.replace(/\D/g, "").length < 3) return "Código de segurança inválido.";
    return null;
  };

  const submitOrder = async () => {
    if (giftOn && !giftTo.trim()) {
      const message = "Informe quem vai receber o presente (ou desmarque a opção).";
      setError(message);
      notify(message, "error");
      return;
    }
    if (!isValidTaxId(taxId)) {
      const message = "CPF/CNPJ inválido — volte ao passo Dados e confira.";
      setError(message);
      notify(message, "error");
      return;
    }
    if (paymentMethod !== "pix") {
      const cardError = validateCardFields();
      if (cardError) {
        setError(cardError);
        notify(cardError, "error");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      // 1) pedido — reaproveitado quando a cobrança anterior foi recusada
      // e o método de pagamento não mudou (senão, um novo pedido é criado)
      let base = createdOrder?.method === paymentMethod ? createdOrder : null;
      if (createdOrder && !base) setCreatedOrder(null);
      if (!base) {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            items: cart,
            email,
            name,
            phone,
            paymentMethod,
            payment: { taxId },
            shippingOption,
            coupon: appliedCoupon?.code,
            ...(giftOn && giftTo.trim()
              ? { gift: { to: giftTo.trim(), message: giftMessage, wrap: giftWrap } }
              : {}),
            address: hasPhysical
              ? { cep, street, number, complement, neighborhood, city, state }
              : undefined,
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          orderId: string;
          code: string;
          total: number;
          discount?: number;
          gift?: boolean;
          digitalItems: string[];
        };

        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Não foi possível concluir o pedido.");
        }

        base = {
          orderId: data.orderId,
          method: paymentMethod,
          code: data.code,
          total: data.total,
          discount: data.discount ?? 0,
          gift: Boolean(data.gift),
          digitalItems: data.digitalItems,
          status: "aguardando_pagamento",
        };
        setCreatedOrder(base);
      }

      // 2) cobrança — PIX gera QR Code; cartão cobra em um passo (§7.4)
      if (paymentMethod === "pix") {
        const charge = await chargeRequest(base.orderId, "pix");
        if (!charge.ok) throw new Error(charge.error);
        setResult({ ...base, pix: charge.pix });
        setPendingMessage(null);
        setStep("pedido");
        notify("Pedido criado — pague o PIX para confirmar.", "success");
        return;
      }

      const expiry = /^(\d{2})\/(\d{2})$/.exec(cardExp.trim());
      const expMonth = expiry?.[1] ?? "";
      const expYear = `20${expiry?.[2] ?? ""}`;
      const holder = (cardHolder.trim() || name).trim();
      const encrypted = await encryptCardData({
        holder,
        number: cardNumber,
        expMonth,
        expYear,
        securityCode: cardCvv,
      });
      const charge = await chargeRequest(base.orderId, paymentMethod, {
        encrypted,
        expMonth,
        expYear,
        installments,
        holder,
      });
      if (!charge.ok) {
        // pedido permanece criado — a revisão permite tentar de novo
        throw new Error(charge.error);
      }
      if (charge.status === "pagamento_aprovado") {
        finishApproved({ ...base, status: "pagamento_aprovado" });
      } else {
        setResult({ ...base });
        setPendingMessage(charge.message ?? null);
        setStep("pedido");
        notify("Pagamento recebido — aguardando confirmação.", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao finalizar pedido";
      setError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // §7.4 — polling de confirmação (fallback do webhook em ambiente local;
  // no ar o webhook confirma sem o comprador na página).
  useEffect(() => {
    if (step !== "pedido" || !result || result.status !== "aguardando_pagamento") return;
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${result.orderId}`);
        const data = (await res.json()) as { ok?: boolean; status?: string; message?: string };
        if (!active || !res.ok || !data.ok) return;
        if (data.status === "pagamento_aprovado") {
          finishApproved({ ...result, status: "pagamento_aprovado" });
        } else {
          setPendingMessage(data.message ?? null);
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result?.orderId, result?.status]);

  /** Novo QR Code quando o anterior expirou (30 min). */
  const regeneratePix = async () => {
    if (!result) return;
    try {
      const charge = await chargeRequest(result.orderId, "pix");
      if (!charge.ok) throw new Error(charge.error);
      setResult({ ...result, pix: charge.pix });
      setPendingMessage(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível gerar um novo código.";
      notify(message, "error");
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; discount?: number };
      if (!res.ok || !data.ok || typeof data.discount !== "number") {
        throw new Error(data.error ?? "Cupom inválido.");
      }
      setAppliedCoupon({ code, discount: data.discount });
      setCouponInput("");
      notify("Cupom aplicado com sucesso!", "success");
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Cupom inválido.");
    } finally {
      setCouponBusy(false);
    }
  };

  if (step === "pedido" && result) {
    const approved = result.status === "pagamento_aprovado";
    const pixExpires = result.pix
      ? new Date(result.pix.expiresAt).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    return (
      <Page>
        <Section title={approved ? "Pedido concluído" : "Aguardando pagamento"}>
          <div className="card mx-auto max-w-2xl gap-4 p-10 text-center">
            {approved ? (
              <>
                <p className="text-display text-5xl text-gold">Obrigado!</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Seu pedido <strong className="text-gold">{result.code}</strong> foi registrado
                  e o pagamento aprovado.
                </p>
              </>
            ) : (
              <>
                <p className="text-display text-4xl">Pedido {result.code} criado</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {result.pix
                    ? "Pague com PIX para confirmar — a confirmação é automática."
                    : "Aguardando a confirmação do pagamento."}
                </p>
              </>
            )}
            {(result.discount ?? 0) > 0 && (
              <p className="text-sm text-gold">
                Cupom aplicado — desconto de {formatPrice(result.discount ?? 0)} já contabilizado.
              </p>
            )}
            {result.gift && (
              <p className="text-sm text-[var(--text-muted)]">
                Presente configurado — destinatário e recado aparecem no acompanhamento do pedido.
              </p>
            )}
            <dl className="mx-auto grid max-w-sm gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Total</dt>
                <dd className="font-bold text-gold">{formatPrice(result.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd className={`font-bold ${approved ? "text-emerald-300" : "text-orange-300"}`}>
                  {approved ? "Pagamento aprovado" : "Aguardando pagamento"}
                </dd>
              </div>
            </dl>

            {!approved && result.pix && (
              <div className="mx-auto w-full max-w-md space-y-3 rounded-xl border border-[var(--border)] p-4">
                {/* data URI do gateway — next/image não otimiza imagens inline */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.pix.image}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded-lg bg-white p-2"
                />
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={result.pix.text}
                    className="field min-w-0 flex-1 text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="Código PIX copia e cola"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(result.pix?.text ?? "");
                      notify("Código PIX copiado!", "success");
                    }}
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Abra o app do seu banco e pague por PIX · válido até {pixExpires}
                </p>
                <p className="flex items-center justify-center gap-2 text-xs text-gold">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
                  Atualizando o status automaticamente…
                </p>
                {pendingMessage && (
                  <p className="text-xs text-orange-300">{pendingMessage}</p>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => void regeneratePix()}>
                  Gerar novo código
                </button>
              </div>
            )}
            {!approved && !result.pix && (
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Assim que o pagamento for confirmado, os itens digitais liberam na Biblioteca e
                  o pedido segue para separação.
                </p>
                {pendingMessage && (
                  <p className="mt-2 text-xs text-orange-300">{pendingMessage}</p>
                )}
              </div>
            )}

            {approved && result.digitalItems.length > 0 && (
              <Link href="/biblioteca" className="btn btn-accent mx-auto">
                Ir para a Biblioteca
              </Link>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/loja" className="btn btn-ghost">
                Continuar comprando
              </Link>
              <Link href="/conta" className="btn btn-ghost">
                Ver minha conta
              </Link>
            </div>
          </div>
        </Section>
      </Page>
    );
  }

  if (lines.length === 0) {
    return (
      <Page>
        <Section title="Checkout">
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <p className="text-display text-4xl">Nada para pagar ainda</p>
            <Link href="/loja" className="btn btn-primary">
              Ir para a loja
            </Link>
          </div>
        </Section>
      </Page>
    );
  }

  return (
    <Page>
      <Section title="Checkout" subtitle="Dados → Entrega → Pagamento → Revisão → Pedido">
        {/* stepper */}
        <ol className="mb-8 flex flex-wrap gap-2">
          {steps.slice(0, 4).map((s, index) => {
            const active = s.key === step;
            const done = steps.findIndex((x) => x.key === step) > index;
            return (
              <li
                key={s.key}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  active
                    ? "border-transparent bg-violet text-white"
                    : done
                      ? "border-transparent bg-gold text-ink"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {index + 1}. {s.label}
              </li>
            );
          })}
        </ol>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="card p-6">
            {error && (
              <p className="mb-4 rounded-lg bg-[#e5484d]/15 px-4 py-3 text-sm text-[#e5484d]">
                {error}
              </p>
            )}

            {step === "dados" && (
              <form onSubmit={goNext} className="space-y-4">
                <h2 className="text-display text-2xl">Dados</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {user
                    ? "Você está comprando como usuário logado — dados pré-preenchidos."
                    : "Você pode comprar como convidado ou entrar na sua conta."}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className="field"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                  />
                  <input
                    className="field"
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                  />
                  <input
                    className="field"
                    placeholder="Telefone (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <input
                    className="field"
                    placeholder="CPF ou CNPJ"
                    inputMode="numeric"
                    autoComplete="off"
                    value={taxId}
                    onChange={(e) => setTaxId(maskTaxId(e.target.value))}
                    required
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  O documento é exigido pelo PagBank para processar o pagamento com segurança.
                </p>
                <button type="submit" className="btn btn-primary">
                  Continuar para entrega
                </button>
              </form>
            )}

            {step === "entrega" && (
              <form onSubmit={goNext} className="space-y-4">
                <h2 className="text-display text-2xl">Entrega</h2>

                {hasPhysical ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <input className="field" placeholder="CEP" value={cep} onChange={(e) => setCep(e.target.value)} required />
                      <input className="field sm:col-span-2" placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} required />
                      <input className="field" placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} required />
                      <input className="field sm:col-span-2" placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
                      <input className="field" placeholder="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
                      <input className="field" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} required />
                      <input className="field" placeholder="UF" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} required />
                    </div>

                    <p
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        freeShipping || plusFree
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-[var(--border)] text-[var(--text-muted)]"
                      }`}
                    >
                      {plusFree
                        ? "Frete grátis do Cliffhanger+ neste pedido."
                        : freeShipping
                          ? "Você ganhou frete grátis neste pedido."
                          : `Faltam ${formatPrice(freeFrom - subtotal)} para o frete grátis.`}
                    </p>

                    <fieldset className="space-y-2">
                      <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">
                        Opções de envio
                      </legend>
                      {quote && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Cotação para {quote.cep}
                          {quote.state ? ` · ${quote.state}` : ""} · região {quote.regionLabel}
                        </p>
                      )}
                      {(["standard", "express"] as const).map((optionId) => {
                        const option = quote?.options.find((o) => o.id === optionId);
                        const label =
                          option?.label ??
                          (optionId === "standard"
                            ? "Padrão · 5 a 8 dias úteis"
                            : "Expressa · 2 a 3 dias úteis");
                        const price = quotePrice(optionId);
                        return (
                          <label
                            key={optionId}
                            className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
                              shippingOption === optionId
                                ? "border-violet-soft"
                                : "border-[var(--border)]"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="shipping"
                                checked={shippingOption === optionId}
                                onChange={() => setShippingOption(optionId)}
                              />
                              {label}
                            </span>
                            <strong className="text-gold">
                              {price === 0 ? "Grátis" : formatPrice(price)}
                            </strong>
                          </label>
                        );
                      })}
                      {quoteError && (
                        <p className="text-xs text-[#e5484d]">
                          Não foi possível cotar pelo CEP agora — estimativa exibida. ({quoteError})
                        </p>
                      )}
                    </fieldset>
                  </>
                ) : (
                  <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
                    Pedido 100% digital — nada será enviado pelo correio. O acesso é liberado na
                    Biblioteca após a confirmação do pagamento.
                  </p>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={goBack} className="btn btn-ghost">
                    Voltar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Continuar para pagamento
                  </button>
                </div>
              </form>
            )}

            {step === "pagamento" && (
              <form onSubmit={goNext} className="space-y-4">
                <h2 className="text-display text-2xl">Pagamento</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      { key: "pix", label: "PIX", hint: "Aprovação imediata" },
                      { key: "credito", label: "Crédito", hint: "Até 6x sem juros" },
                      { key: "debito", label: "Débito", hint: "Na hora" },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.key}
                      className={`cursor-pointer rounded-xl border p-4 text-center transition ${
                        paymentMethod === option.key
                          ? "border-violet bg-violet/10"
                          : "border-[var(--border)] hover:border-violet-soft"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        className="sr-only"
                        checked={paymentMethod === option.key}
                        onChange={() => setPaymentMethod(option.key)}
                      />
                      <span className="text-display block text-xl">{option.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{option.hint}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Ambiente de teste (PagBank sandbox) — nenhum pagamento real é processado.
                </p>

                {paymentMethod !== "pix" && (
                  <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                    <p className="text-sm font-bold">Dados do cartão</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="field sm:col-span-2"
                        placeholder="Número do cartão"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        required
                      />
                      <input
                        className="field"
                        placeholder="Nome impresso no cartão"
                        autoComplete="cc-name"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        required
                      />
                      <input
                        className="field"
                        placeholder="Validade (MM/AA)"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        value={cardExp}
                        onChange={(e) => setCardExp(formatExpiry(e.target.value))}
                        required
                      />
                      <input
                        className="field"
                        placeholder="Código de segurança"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        required
                      />
                      {paymentMethod === "credito" && (
                        <label className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">Parcelas</span>
                          <select
                            className="field flex-1"
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                          >
                            {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}x{n > 1 ? ` de ${formatPrice(total / n)}` : ""} sem juros
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Os dados do cartão são criptografados no seu navegador pelo SDK do PagBank —
                      nenhum número de cartão passa pelos servidores da loja.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-[var(--border)] p-4 text-sm">
                  <p className="font-bold">Cupom de desconto</p>
                  {appliedCoupon ? (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[var(--text-muted)]">
                        <strong className="text-gold">{appliedCoupon.code}</strong> · −
                        {formatPrice(appliedCoupon.discount)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput("");
                          setCouponError(null);
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        className="field min-w-40 flex-1"
                        placeholder="Código do cupom"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={couponBusy || !couponInput.trim()}
                        onClick={() => void applyCoupon()}
                      >
                        {couponBusy ? "Validando…" : "Aplicar"}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="mt-2 text-xs text-[#e5484d]">{couponError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={goBack} className="btn btn-ghost">
                    Voltar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Revisar pedido
                  </button>
                </div>
              </form>
            )}

            {step === "revisao" && (
              <div className="space-y-4">
                <h2 className="text-display text-2xl">Revisão</h2>

                <div className="rounded-xl border border-[var(--border)] p-4 text-sm">
                  <p className="font-bold">Itens</p>
                  <ul className="mt-2 space-y-1">
                    {lines.map(({ product, item }) => (
                      <li key={product.id} className="flex justify-between gap-3">
                        <span className="text-[var(--text-muted)]">
                          {item.qty}× {product.title}{" "}
                          <em className="not-italic opacity-70">
                            ({product.digital ? "digital" : "envio"}
                            {product.badge === "PRÉ-VENDA" ? " · pré-venda" : ""})
                          </em>
                        </span>
                        <span>{formatPrice(product.price * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {lines.some((l) => l.product.badge === "PRÉ-VENDA") && (
                  <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
                    Pré-venda: itens reservados — os físicos são enviados e os digitais liberados
                    na data prevista de lançamento.
                  </p>
                )}

                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="font-bold">Contato</p>
                    <p className="mt-1 text-[var(--text-muted)]">{name}</p>
                    <p className="text-[var(--text-muted)]">{email}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <p className="font-bold">{hasPhysical ? "Entrega" : "Entrega digital"}</p>
                    {hasPhysical ? (
                      <p className="mt-1 text-[var(--text-muted)]">
                        {street}, {number} — {neighborhood}, {city}/{state} · {cep}
                      </p>
                    ) : (
                      <p className="mt-1 text-[var(--text-muted)]">Biblioteca Cliffhanger</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 font-bold">
                    <input
                      type="checkbox"
                      checked={giftOn}
                      onChange={(e) => setGiftOn(e.target.checked)}
                    />
                    É um presente
                  </label>
                  {giftOn && (
                    <div className="mt-3 space-y-3">
                      <input
                        className="field"
                        placeholder="Quem vai receber (destinatário)"
                        value={giftTo}
                        onChange={(e) => setGiftTo(e.target.value)}
                      />
                      <textarea
                        className="field"
                        rows={3}
                        placeholder="Recado para quem recebe (opcional)"
                        maxLength={300}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                      />
                      {hasPhysical && (
                        <label className="flex cursor-pointer items-center gap-2 text-[var(--text-muted)]">
                          <input
                            type="checkbox"
                            checked={giftWrap}
                            onChange={(e) => setGiftWrap(e.target.checked)}
                          />
                          Embrulhar para presente
                        </label>
                      )}
                      <p className="text-xs text-[var(--text-muted)]">
                        O pedido é registrado como presente — destinatário, recado e embrulho
                        aparecem no acompanhamento em /pedidos.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4 text-sm">
                  <p className="font-bold">
                    Pagamento:{" "}
                    {paymentMethod === "pix"
                      ? "PIX"
                      : paymentMethod === "credito"
                        ? `Cartão de crédito — ${installments}x de ${formatPrice(total / installments)} sem juros`
                        : "Cartão de débito"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={goBack} className="btn btn-ghost">
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={submitOrder}
                    disabled={submitting}
                    className="btn btn-accent"
                  >
                    {submitting
                      ? "Processando…"
                      : createdOrder
                        ? `Tentar pagar · ${formatPrice(total)}`
                        : `Confirmar · ${formatPrice(total)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* resumo */}
          <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-32">
            <h2 className="text-display text-2xl">Resumo</h2>
            <ul className="space-y-2 text-sm">
              {lines.map(({ product, item }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="h-10 w-8 shrink-0 overflow-hidden rounded border border-[var(--border)]">
                    <ProductArt product={product} />
                  </span>
                  <span className="line-clamp-2 flex-1 text-xs">
                    {item.qty}× {product.title}
                  </span>
                  <span className="text-xs font-bold">{formatPrice(product.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-[var(--border)] pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Frete</dt>
                <dd>{shipping === 0 ? "Grátis" : formatPrice(shipping)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-gold">
                  <dt>Cupom {appliedCoupon?.code}</dt>
                  <dd>−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--border)] pt-2 font-bold">
                <dt>Total</dt>
                <dd className="text-gold">{formatPrice(total)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => router.push("/carrinho")}
              className="btn btn-ghost w-full"
            >
              Editar carrinho
            </button>
          </aside>
        </div>
      </Section>
    </Page>
  );
}
