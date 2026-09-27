"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { SelectInput } from "@/components/admin/form-fields";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * §12 — pedidos na conta: histórico com filtro por situação. O detalhe
 * com rastreio continua em /pedidos — sem duplicar a lógica.
 */

type Filter = "all" | "processing" | "shipping" | "delivered" | "cancelled";

const OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "processing", label: "Em processamento" },
  { value: "shipping", label: "Enviados" },
  { value: "delivered", label: "Entregues" },
  { value: "cancelled", label: "Cancelados" },
];

function groupOf(status: OrderStatus): Exclude<Filter, "all"> {
  if (status === "cancelado") return "cancelled";
  if (status === "entregue") return "delivered";
  if (status === "enviado") return "shipping";
  return "processing";
}

export default function ContaPedidosPage() {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const res = await fetch("/api/orders/mine", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = (await res.json()) as { orders?: Order[] };
          setOrders(data.orders ?? []);
        }
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  const list = orders.filter((order) => filter === "all" || groupOf(order.status) === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-2xl text-gold">Pedidos</p>
          <p className="text-xs text-[var(--text-muted)]">
            Histórico de compras — {orders.length} pedido(s)
          </p>
        </div>
        <div className="w-56">
          <SelectInput value={filter} options={OPTIONS} onChange={(v) => setFilter(v as Filter)} />
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando pedidos…</p>}

      {!loading && list.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-display text-2xl">
            {orders.length === 0 ? "Nenhum pedido ainda" : "Nada neste filtro"}
          </p>
          <Link href="/loja" className="btn btn-primary mt-4 px-4 py-2 text-xs">
            Explorar a loja
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {list.map((order) => (
          <Link
            key={order.id}
            href="/pedidos"
            className="card flex flex-wrap items-center gap-3 p-4 transition hover:border-gold/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{order.code || order.id}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {ORDER_STATUS_LABEL[order.status] ?? order.status} ·{" "}
                {order.items.reduce((sum, item) => sum + item.qty, 0)} item(ns)
              </p>
            </div>
            <span className="text-sm font-bold text-gold">
              R$ {Number(order.total ?? 0).toFixed(2)}
            </span>
          </Link>
        ))}
      </div>

      {list.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Detalhe e rastreio na página <Link href="/pedidos" className="text-gold underline">Meus pedidos</Link>.
        </p>
      )}
    </div>
  );
}
