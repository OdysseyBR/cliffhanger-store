"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminCustomers } from "@/components/admin/useAdminCustomers";
import { TextInput } from "@/components/admin/form-fields";
import { ORDER_STATUS_LABEL, orderStatusClass } from "@/lib/order-status";
import type { AdminCustomer } from "@/lib/types";

/**
 * Módulo Clientes do painel (Documento de Correção §12): leitura agregada
 * dos pedidos — contas, compras, ticket e últimos pedidos. Não há escrita:
 * a matriz de permissões §13 define apenas `customers.view`.
 */

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

export default function AdminCustomersPage() {
  const { user } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const { customers, error, loading } = useAdminCustomers();

  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para ver os clientes." />;
  }

  const allowed = roleLoading || can("customers.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">customers.view</code> — clientes são restritos aos papéis
          Administrador, Comercial, Atendimento e Financeiro (§13).
        </p>
      </div>
    );
  }

  const list = customers ?? [];
  const needle = filter.trim().toLowerCase();
  const visible = list.filter((customer) => {
    if (!needle) return true;
    return (
      customer.name.toLowerCase().includes(needle) ||
      customer.email.includes(needle) ||
      (customer.phone ?? "").includes(needle)
    );
  });

  const totals = {
    customers: list.length,
    orders: list.reduce((sum, c) => sum + c.orders, 0),
    items: list.reduce((sum, c) => sum + c.items, 0),
    spent: list.reduce((sum, c) => sum + c.spent, 0),
  };
  const ticket = totals.orders > 0 ? totals.spent / totals.orders : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Clientes</p>
          <p className="text-xs text-[var(--text-muted)]">
            Contas, compras e histórico — leitura agregada dos pedidos, sem cadastro separado
            {customers ? ` · ${totals.customers} cliente(s)` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Clientes
          </p>
          <p className="text-lg font-bold">{totals.customers}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Pedidos
          </p>
          <p className="text-lg font-bold">{totals.orders}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Itens comprados
          </p>
          <p className="text-lg font-bold">{totals.items}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Receita
          </p>
          <p className="text-lg font-bold text-emerald-300">{money(totals.spent)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Ticket médio
          </p>
          <p className="text-lg font-bold text-gold">{money(ticket)}</p>
        </div>
      </div>

      <TextInput
        value={filter}
        placeholder="Filtrar por nome, e-mail ou telefone"
        onChange={setFilter}
      />

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando clientes…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum cliente corresponde ao filtro — o cadastro nasce automaticamente dos pedidos.
        </p>
      )}

      {visible.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {visible.map((customer: AdminCustomer) => {
            const isOpen = openId === customer.id;
            return (
              <div key={customer.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gold">{customer.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {customer.email}
                      {customer.phone ? ` · ${customer.phone}` : ""} · {customer.orders} pedido(s) ·{" "}
                      {customer.items} item(ns) · {money(customer.spent)} · último em{" "}
                      {when(customer.lastOrderAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {customer.lastStatus ? (
                      <span
                        className={`rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${orderStatusClass(customer.lastStatus)}`}
                      >
                        {ORDER_STATUS_LABEL[customer.lastStatus]}
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        sem pedidos
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      onClick={() => setOpenId(isOpen ? null : customer.id)}
                    >
                      {isOpen ? "Ocultar" : "Pedidos"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs">
                    {customer.recent.length === 0 && (
                      <p className="text-[var(--text-muted)]">Sem pedidos registrados.</p>
                    )}
                    {customer.recent.map((order) => (
                      <p
                        key={order.id}
                        className="flex flex-wrap justify-between gap-3 text-[var(--text-muted)]"
                      >
                        <span>
                          <strong className="text-[var(--text)]">{order.code}</strong> ·{" "}
                          {when(order.createdAt)}
                        </span>
                        <span>
                          <span className={orderStatusClass(order.status)}>
                            {ORDER_STATUS_LABEL[order.status]}
                          </span>{" "}
                          · {money(order.total)}
                        </span>
                      </p>
                    ))}
                    <p className="border-t border-[var(--border)] pt-2 text-[var(--text-muted)]">
                      Primeiro pedido em {when(customer.firstOrderAt)} ·{" "}
                      {customer.recent.length >= 5 ? "últimos 5 pedidos" : "todos os pedidos"}
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
