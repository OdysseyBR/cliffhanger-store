"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getClientAuth } from "@/lib/firebase";
import { ORDER_STATUS_LABEL, orderStatusClass } from "@/lib/order-status";
import type { Order } from "@/lib/types";

/**
 * Meus pedidos (Documento de Correção §17 — acompanhamento e histórico;
 * §22 — rota obrigatória `/pedidos`).
 */

const PAYMENT_LABEL: Record<Order["paymentMethod"], string> = {
  pix: "PIX",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
};

/** §17 — acompanhamento: etapas do pedido até a entrega. */
const TRACK: { key: Order["status"]; label: string }[] = [
  { key: "aguardando_pagamento", label: "Pagamento" },
  { key: "pagamento_aprovado", label: "Aprovado" },
  { key: "em_separacao", label: "Em separação" },
  { key: "enviado", label: "Enviado" },
  { key: "entregue", label: "Entregue" },
];

function StatusTimeline({ order }: { order: Order }) {
  if (order.status === "cancelado") {
    return (
      <p className="mt-4 rounded-xl border border-[#e5484d]/40 bg-[#e5484d]/10 px-4 py-3 text-sm text-[#e5484d]">
        Pedido cancelado — fale com o suporte em /contato se precisar de ajuda.
      </p>
    );
  }
  const found = TRACK.findIndex((step) => step.key === order.status);
  const index = found === -1 ? 0 : found;
  return (
    <ol className="mt-4 flex flex-wrap items-start gap-y-2">
      {TRACK.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step.key} className="flex min-w-32 flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
                done || active
                  ? "border-transparent bg-gold text-ink"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
              aria-hidden="true"
            >
              {done ? (
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 6.5l2.5 2.5L10 3.5" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`whitespace-nowrap text-xs ${
                active
                  ? "font-bold text-gold"
                  : done
                    ? ""
                    : "text-[var(--text-muted)]"
              }`}
            >
              {step.label}
            </span>
            {i < TRACK.length - 1 && (
              <span
                className={`hidden h-px flex-1 sm:block ${done ? "bg-gold" : "bg-[var(--border)]"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OrderCard({ order }: { order: Order }) {
  return (
    <article className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-display text-2xl text-gold">{order.code}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatDate(order.createdAt)} · {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </p>
        </div>
        <span
          className={`rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold uppercase tracking-wider ${orderStatusClass(order.status)}`}
        >
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <StatusTimeline order={order} />

      {order.address && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Entrega: {order.address.street}, {order.address.number} — {order.address.neighborhood},{" "}
          {order.address.city}/{order.address.state} · {order.address.cep}
        </p>
      )}

      <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {order.items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span>
              {item.title}
              {item.digital && (
                <span className="ml-2 rounded-full border border-violet/50 bg-violet/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-soft">
                  Digital
                </span>
              )}
              {item.preOrder && (
                <span className="ml-2 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                  Pré-venda
                </span>
              )}
            </span>
            <span className="shrink-0 text-[var(--text-muted)]">
              {item.qty} × {brl(item.price)}
            </span>
          </li>
        ))}
      </ul>

      {order.gift && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
          <p className="font-bold text-gold">Presente para {order.gift.to}</p>
          {order.gift.message && (
            <p className="mt-1 text-[var(--text-muted)]">“{order.gift.message}”</p>
          )}
          {order.gift.wrap && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">Embrulhado para presente.</p>
          )}
        </div>
      )}

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--text-muted)]">Subtotal</dt>
          <dd>{brl(order.subtotal)}</dd>
        </div>
        {(order.discount ?? 0) > 0 && (
          <div className="flex justify-between text-gold">
            <dt>Cupom {order.couponCode}</dt>
            <dd>−{brl(order.discount ?? 0)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[var(--text-muted)]">Frete</dt>
          <dd>{order.shipping > 0 ? brl(order.shipping) : "Grátis"}</dd>
        </div>
        <div className="flex justify-between font-bold">
          <dt>Total</dt>
          <dd>{brl(order.total)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function PedidosPage() {
  const { user, authLoading, firebaseReady } = useStore();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!user || !firebaseReady || authLoading) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        if (!token) throw new Error("Sessão expirada — entre novamente.");
        const res = await fetch("/api/orders/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json().catch(() => ({}))) as {
          orders?: Order[];
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar os pedidos.");
        setError(null);
        setOrders(body.orders ?? []);
      } catch (cause) {
        setOrders(null);
        setError(cause instanceof Error ? cause.message : "Falha ao carregar os pedidos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, firebaseReady, retryTick]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryTick((tick) => tick + 1);
  };

  return (
    <Page>
      <Section
        title="Meus pedidos"
        subtitle="Acompanhe o status da entrega e o histórico de compras da sua conta."
      >
        {authLoading ? (
          <div className="card p-6 text-[var(--text-muted)]">Verificando sessão…</div>
        ) : !user ? (
          <div className="card mx-auto max-w-xl space-y-4 p-6 text-center">
            <h2 className="text-display text-2xl">Entre para ver seus pedidos</h2>
            <p className="text-sm text-[var(--text-muted)]">
              O histórico fica ligado à sua conta Cliffhanger — compras feitas com
              o mesmo e-mail também aparecem aqui.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/login" className="btn btn-primary px-6">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn btn-ghost px-6">
                Criar conta
              </Link>
            </div>
          </div>
        ) : !firebaseReady ? (
          <div className="card border border-gold/40 bg-gold/10 p-6 text-sm">
            Firebase não configurado neste ambiente — o histórico de pedidos
            precisa das chaves em <code>.env.local</code>.
          </div>
        ) : loading && !orders ? (
          <div className="grid gap-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="card mx-auto max-w-xl space-y-4 border-[#e5484d]/40 p-6 text-center">
            <p className="text-sm text-[#e5484d]">{error}</p>
            <button type="button" onClick={retry} className="btn btn-ghost px-6">
              Tentar novamente
            </button>
          </div>
        ) : orders && orders.length === 0 ? (
          <div className="card mx-auto max-w-xl space-y-4 p-6 text-center">
            <h2 className="text-display text-2xl">Nenhum pedido ainda</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Quando você fizer a primeira compra, o pedido aparece aqui com o
              status de separação, envio e entrega.
            </p>
            <Link href="/loja" className="btn btn-primary px-6">
              Explorar a loja
            </Link>
          </div>
        ) : orders ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            <p className="text-xs text-[var(--text-muted)]">
              Dúvidas sobre um pedido? Fale com o suporte em{" "}
              <Link href="/contato" className="text-gold transition hover:underline">
                /contato
              </Link>
              .
            </p>
          </div>
        ) : null}
      </Section>
    </Page>
  );
}
