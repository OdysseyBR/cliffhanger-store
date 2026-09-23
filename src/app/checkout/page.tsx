"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { ProductArt } from "@/components/ProductArt";
import { formatPrice } from "@/lib/format";
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
  code: string;
  total: number;
  digitalItems: string[];
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
  // pagamento
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credito" | "debito">("pix");

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
  const hasPhysical = lines.some((l) => !l.product.digital);
  const freeShipping = subtotal >= 199;
  const shipping = !hasPhysical ? 0 : freeShipping ? 0 : shippingOption === "express" ? 39.9 : 24.9;
  const total = subtotal + shipping;

  const goNext = (event: FormEvent) => {
    event.preventDefault();
    const order = steps.findIndex((s) => s.key === step);
    setStep(steps[Math.min(order + 1, steps.length - 1)].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    const order = steps.findIndex((s) => s.key === step);
    if (order > 0) setStep(steps[order - 1].key);
  };

  const submitOrder = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          email,
          name,
          phone,
          paymentMethod,
          shipping,
          address: hasPhysical
            ? { cep, street, number, complement, neighborhood, city, state }
            : undefined,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code: string;
        total: number;
        digitalItems: string[];
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Não foi possível concluir o pedido.");
      }

      // itens digitais vão para a Biblioteca
      try {
        const raw = window.localStorage.getItem("ch:library");
        const library: string[] = raw ? (JSON.parse(raw) as string[]) : [];
        const merged = Array.from(new Set([...library, ...data.digitalItems]));
        window.localStorage.setItem("ch:library", JSON.stringify(merged));
      } catch {
        /* storage indisponível */
      }

      setResult({ code: data.code, total: data.total, digitalItems: data.digitalItems });
      setStep("pedido");
      clearCart();
      notify("Pedido realizado com sucesso!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao finalizar pedido";
      setError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "pedido" && result) {
    return (
      <Page>
        <Section title="Pedido concluído">
          <div className="card mx-auto max-w-2xl gap-4 p-10 text-center">
            <p className="text-display text-5xl text-gold">Obrigado!</p>
            <p className="text-sm text-[var(--text-muted)]">
              Seu pedido <strong className="text-gold">{result.code}</strong> foi registrado.
              {paymentMethod === "pix" &&
                " O QR Code PIX seria exibido aqui — após a confirmação, os itens digitais liberam na Biblioteca."}
            </p>
            <dl className="mx-auto grid max-w-sm gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Total</dt>
                <dd className="font-bold text-gold">{formatPrice(result.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd className="font-bold">Aguardando pagamento</dd>
              </div>
            </dl>
            {result.digitalItems.length > 0 && (
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
                    ? "border-transparent bg-violet text-paper"
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
                </div>
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

                    <fieldset className="space-y-2">
                      <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">
                        Opções de envio
                      </legend>
                      <label className={`flex items-center justify-between rounded-xl border p-3 text-sm ${shippingOption === "standard" ? "border-violet-soft" : "border-[var(--border)]"}`}>
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingOption === "standard"}
                            onChange={() => setShippingOption("standard")}
                          />
                          Padrão · 5 a 8 dias úteis
                        </span>
                        <strong className="text-gold">{freeShipping ? "Grátis" : formatPrice(24.9)}</strong>
                      </label>
                      <label className={`flex items-center justify-between rounded-xl border p-3 text-sm ${shippingOption === "express" ? "border-violet-soft" : "border-[var(--border)]"}`}>
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingOption === "express"}
                            onChange={() => setShippingOption("express")}
                          />
                          Expressa · 2 a 3 dias úteis
                        </span>
                        <strong className="text-gold">{freeShipping ? "Grátis" : formatPrice(39.9)}</strong>
                      </label>
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
                  Ambiente de demonstração (PagBank sandbox) — nenhum pagamento real é processado.
                </p>
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
                            ({product.digital ? "digital" : "envio"})
                          </em>
                        </span>
                        <span>{formatPrice(product.price * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

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
                  <p className="font-bold">
                    Pagamento: {paymentMethod === "pix" ? "PIX" : paymentMethod === "credito" ? "Cartão de crédito" : "Cartão de débito"}
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
                    {submitting ? "Processando…" : `Confirmar · ${formatPrice(total)}`}
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
