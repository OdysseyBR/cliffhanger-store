"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PAYMENT_LABEL } from "@/lib/order-fields";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * §12 — detalhe do pedido na conta: itens, valores, entrega, pagamento e
 * situação. Só os próprios pedidos (fonte: `/api/orders/mine`); id
 * desconhecido ou de outra conta cai em "não encontrado".
 */

export default function ContaPedidoDetalhePage() {
  const { user } = useStore();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const res = await fetch("/api/orders/mine", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { orders?: Order[] };
        const found = (data.orders ?? []).find((item) => item.id === params.id) ?? null;
        if (found) setOrder(found);
        else setMissing(true);
      } catch {
        setMissing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, params.id]);

  if (!user) return null;

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando pedido…</p>;
  }

  if (!order) {
    return (
      <div className="card p-8 text-center">
        <p className="text-display text-2xl">Pedido não encontrado</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {missing
            ? "Confira o histórico — este pedido pode ser de outra conta."
            : "Falha ao carregar."}
        </p>
        <Link href="/conta/pedidos" className="btn btn-primary mt-4 px-4 py-2 text-xs">
          Voltar aos pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/conta/pedidos" className="text-xs text-gold underline">
          ← Todos os pedidos
        </Link>
        <p className="text-display mt-1 text-2xl text-gold">{order.code || order.id}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status} ·{" "}
          {PAYMENT_LABEL[order.paymentMethod as "pix"] ?? order.paymentMethod}
          {order.couponCode ? ` · cupom ${order.couponCode}` : ""}
        </p>
      </div>

      <div className="card space-y-1 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Itens ({order.items.reduce((sum, item) => sum + item.qty, 0)})
        </p>
        {order.items.map((item, index) => (
          <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate">
              {item.qty}× {item.title}
            </span>
            <span className="shrink-0 font-bold">{formatPrice(item.price * item.qty)}</span>
          </div>
        ))}
      </div>

      <div className="card space-y-1 p-4 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {(order.discount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Desconto</span>
            <span>−{formatPrice(order.discount ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Frete</span>
          <span>{order.shipping === 0 ? "Grátis" : formatPrice(order.shipping)}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--border)] pt-1 text-sm font-bold text-gold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {order.address && (
        <div className="card space-y-1 p-4 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Entrega
          </p>
          <p>
            {order.address.street}, {order.address.number}
            {order.address.complement ? ` · ${order.address.complement}` : ""} —{" "}
            {order.address.neighborhood}, {order.address.city}/{order.address.state} · CEP{" "}
            {order.address.cep}
          </p>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        Rastreio e conversa com o suporte na página{" "}
        <Link href="/pedidos" className="text-gold underline">
          Meus pedidos
        </Link>
        .
      </p>
    </div>
  );
}
