"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminOrders } from "@/components/admin/useAdminOrders";
import { updateOrderStatus } from "@/components/admin/admin-api";
import { SelectInput, TextInput } from "@/components/admin/form-fields";
import { PAYMENT_LABEL } from "@/lib/order-fields";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_LIST,
  normalizeStatus,
  orderStatusClass,
} from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * Módulo Pedidos do painel (Documento de Correção §12): listagem, filtros,
 * detalhe do pedido e mudança de status do fluxo §17 (aguardando pagamento
 * → aprovado → separação → enviado → entregue, ou cancelado).
 * Pedidos nunca são excluídos — o histórico é a base da auditoria (§13).
 */

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  ...ORDER_STATUS_LIST.map((status) => ({ value: status, label: ORDER_STATUS_LABEL[status] })),
];

const money = (value: number) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function when(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default function AdminOrdersPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const { orders, error, loading, reload } = useAdminOrders();

  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleStatus = async (order: Order) => {
    const current = normalizeStatus(order.status);
    const next = (pending[order.id] ?? current) as OrderStatus;
    if (next === current) {
      notify("Escolha um status diferente antes de salvar.", "error");
      return;
    }
    if (
      next === "cancelado" &&
      !window.confirm(`Cancelar o pedido ${order.code}? O histórico é mantido.`)
    ) {
      return;
    }

    setBusyId(order.id);
    const result = await updateOrderStatus(order.id, next);
    setBusyId(null);
    if (result.ok) {
      notify(
        result.data.changed
          ? `Pedido ${order.code}: ${ORDER_STATUS_LABEL[current]} → ${ORDER_STATUS_LABEL[next]}`
          : "Nada mudou — o pedido já estava nesse status.",
        "success",
      );
      reload();
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para acompanhar os pedidos." />;
  }

  const allowed = roleLoading || can("orders.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">orders.view</code> — pedidos são restritos aos papéis
          Administrador, Comercial, Estoque, Atendimento e Financeiro (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("orders.edit");
  const list = (orders ?? []).map((order) => ({ ...order, status: normalizeStatus(order.status) }));
  const needle = filter.trim().toLowerCase();
  const visible = list.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false;
    if (!needle) return true;
    return (
      order.code.toLowerCase().includes(needle) ||
      order.email.toLowerCase().includes(needle) ||
      (order.customer?.name ?? "").toLowerCase().includes(needle)
    );
  });

  const counts = {
    total: list.length,
    pending: list.filter((o) => o.status === "aguardando_pagamento").length,
    separating: list.filter((o) => o.status === "em_separacao").length,
    sent: list.filter((o) => o.status === "enviado").length,
    cancelled: list.filter((o) => o.status === "cancelado").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Pedidos</p>
          <p className="text-xs text-[var(--text-muted)]">
            Acompanhamento do fluxo Dados → Entrega → Pagamento → Revisão → Concluído (§17)
            {orders ? ` · ${counts.total} pedido(s)` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost px-4 py-2 text-[11px]"
          onClick={reload}
          disabled={loading}
        >
          Atualizar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total</p>
          <p className="text-lg font-bold">{counts.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Aguardando pagamento
          </p>
          <p className="text-lg font-bold text-orange-300">{counts.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Em separação
          </p>
          <p className="text-lg font-bold text-violet-soft">{counts.separating}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Enviados
          </p>
          <p className="text-lg font-bold text-emerald-300">{counts.sent}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Cancelados
          </p>
          <p className="text-lg font-bold text-[var(--text-muted)]">{counts.cancelled}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          value={filter}
          placeholder="Filtrar por código, cliente ou e-mail"
          onChange={setFilter}
        />
        <SelectInput value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando pedidos…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error.message}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Nenhum pedido corresponde ao filtro.</p>
      )}

      {visible.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {visible.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
            const isOpen = openId === order.id;
            return (
              <div key={order.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gold">
                      {order.code}
                      <span
                        className={`ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${orderStatusClass(order.status)}`}
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                      {items.some((item) => item.preOrder) && (
                        <span className="ml-2 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                          pré-venda
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {when(order.createdAt)} · {order.customer?.name || order.email} ·{" "}
                      {itemsQty} item(ns) · {money(order.total)} ·{" "}
                      {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      onClick={() => setOpenId(isOpen ? null : order.id)}
                    >
                      {isOpen ? "Ocultar" : "Detalhes"}
                    </button>
                    {canEdit && (
                      <>
                        <div className="w-52">
                          <SelectInput
                            value={pending[order.id] ?? order.status}
                            options={ORDER_STATUS_LIST.map((status) => ({
                              value: status,
                              label: ORDER_STATUS_LABEL[status],
                            }))}
                            onChange={(value) =>
                              setPending((prev) => ({ ...prev, [order.id]: value }))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary px-3 py-2 text-[11px]"
                          disabled={busyId === order.id}
                          onClick={() => void handleStatus(order)}
                        >
                          {busyId === order.id ? "Salvando…" : "Salvar status"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs">
                    <div className="space-y-1">
                      {items.map((item, index) => (
                        <p key={`${item.productId}-${index}`} className="flex justify-between gap-3">
                          <span>
                            {item.qty}× {item.title}
                            {item.preOrder && (
                              <span className="ml-2 text-gold">(pré-venda — reserva)</span>
                            )}
                          </span>
                          <span className="text-[var(--text-muted)]">{money(item.price * item.qty)}</span>
                        </p>
                      ))}
                    </div>
                    <div className="space-y-1 border-t border-[var(--border)] pt-2 text-[var(--text-muted)]">
                      <p className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{money(order.subtotal)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Frete</span>
                        <span>{money(order.shipping)}</span>
                      </p>
                      {order.discount ? (
                        <p className="flex justify-between">
                          <span>Cupom {order.couponCode}</span>
                          <span>− {money(order.discount)}</span>
                        </p>
                      ) : null}
                      <p className="flex justify-between font-bold text-[var(--text)]">
                        <span>Total</span>
                        <span>{money(order.total)}</span>
                      </p>
                    </div>
                    {order.address && (
                      <p className="border-t border-[var(--border)] pt-2 text-[var(--text-muted)]">
                        Entrega: {order.address.street}, {order.address.number} —{" "}
                        {order.address.neighborhood}, {order.address.city}/{order.address.state} ·
                        CEP {order.address.cep}
                      </p>
                    )}
                    {order.gift && (
                      <p className="text-[var(--text-muted)]">
                        Presente para {order.gift.to}
                        {order.gift.wrap ? " (embrulhado)" : ""} — “{order.gift.message}”
                      </p>
                    )}
                    <p className="text-[var(--text-muted)]">
                      Cliente: {order.customer?.name || "—"} · {order.email}
                      {order.customer?.phone ? ` · ${order.customer.phone}` : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
