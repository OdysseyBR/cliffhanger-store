"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminOrders } from "@/components/admin/useAdminOrders";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusClass } from "@/lib/order-status";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/product-fields";
import type { Order } from "@/lib/types";

/**
 * Dashboard do painel (Documento de Correção §12 — módulo 1).
 * Visão geral: KPIs do catálogo, alertas de estoque, distribuição por
 * categoria e pedidos recentes.
 */

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-display text-3xl text-gold">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, logout } = useStore();
  const { products, works, universes, authors, error, loading, reload } =
    useAdminProducts();
  const { orders, error: ordersError } = useAdminOrders();

  const stats = useMemo(() => {
    const items = products ?? [];
    const outOfStock = items.filter((p) => p.stock === 0);
    const lowStock = items.filter((p) => p.stock > 0 && p.stock <= 5);
    const digital = items.filter((p) => p.digital).length;
    const categories = PRODUCT_CATEGORY_OPTIONS.map((option) => ({
      label: option.label,
      count: items.filter((p) => p.category === option.value).length,
    }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
    const maxCount = Math.max(1, ...categories.map((row) => row.count));
    const recent = [...items]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 6);
    return { items, outOfStock, lowStock, digital, categories, maxCount, recent };
  }, [products]);

  const orderStats = useMemo(() => {
    const list = orders ?? [];
    return {
      list,
      pending: list.filter((o) => o.status === "aguardando_pagamento").length,
      cancelados: list.filter((o) => o.status === "cancelado").length,
    };
  }, [orders]);

  if (!user) {
    return (
      <AdminLogin note="Entre com a conta administradora para ver o dashboard." />
    );
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando painel…</p>;
  }

  if (error && !products) {
    return (
      <div className="card mx-auto max-w-lg gap-4 p-6 text-center">
        <p className="text-[#e5484d]">{error}</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={reload} className="btn btn-ghost">
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="btn btn-primary"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* cabeçalho + ações rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Dashboard</p>
          <p className="text-xs text-[var(--text-muted)]">
            Visão geral da loja · conectado como{" "}
            <strong className="text-gold">{user.email}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/produtos/novo"
            className="btn btn-primary px-4 py-2 text-[11px]"
          >
            Novo item
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Itens no catálogo"
          value={stats.items.length}
          sub={`${stats.digital} digitais · ${stats.items.length - stats.digital} físicos`}
        />
        <KpiCard
          label="Pedidos"
          value={orders ? orderStats.list.length : "—"}
          sub={
            orders
              ? `${orderStats.pending} aguardando pagamento · ${orderStats.cancelados} cancelados`
              : ordersError
                ? "sem permissão para ler pedidos"
                : "carregando…"
          }
        />
        <KpiCard
          label="Categorias"
          value={stats.categories.length}
          sub={
            stats.categories.length
              ? `maior: ${stats.categories[0].label} (${stats.categories[0].count})`
              : "nenhuma categoria com itens"
          }
        />
        <KpiCard
          label="Obras cadastradas"
          value={works.length}
          sub={`${universes.length} universos · ${authors.length} autores`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* alertas de estoque */}
        <section className="card space-y-3 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-gold">
            Alertas de estoque
          </p>
          {stats.outOfStock.length === 0 && stats.lowStock.length === 0 ? (
            <p className="text-sm text-emerald-300">
              Nenhum alerta — todo o catálogo tem estoque.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.outOfStock.length > 0 && (
                <li className="text-[#e5484d]">
                  {stats.outOfStock.length} item(ns) esgotado(s) —{" "}
                  <Link href="/admin/produtos" className="underline">
                    repor estoque
                  </Link>
                </li>
              )}
              {stats.lowStock.length > 0 && (
                <li className="text-orange-300">
                  {stats.lowStock.length} item(ns) com estoque baixo (até 5 un.)
                </li>
              )}
              {stats.outOfStock.slice(0, 4).map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate text-[var(--text-muted)]">
                    {product.title}
                  </span>
                  <Link
                    href={`/admin/produtos/${product.id}`}
                    className="btn btn-ghost shrink-0 px-3 py-1.5 text-[11px]"
                  >
                    Repor
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* catálogo por categoria */}
        <section className="card space-y-3 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-gold">
            Catálogo por categoria
          </p>
          {stats.categories.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum item cadastrado ainda.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {stats.categories.map((row) => (
                <li key={row.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{row.label}</span>
                    <span className="font-bold text-gold">{row.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-1.5 rounded-full bg-gold"
                      style={{
                        width: `${Math.round((row.count / stats.maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* pedidos recentes */}
        <section className="card space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wider text-gold">
              Pedidos recentes
            </p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              módulo Pedidos em breve
            </span>
          </div>
          {ordersError ? (
            <p className="text-sm text-[#e5484d]">{ordersError.message}</p>
          ) : !orders ? (
            <p className="text-sm text-[var(--text-muted)]">
              Carregando pedidos…
            </p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum pedido ainda — o checkout da loja grava aqui.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)] text-sm">
              {orderStats.list.slice(0, 5).map((order: Order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {order.code}{" "}
                      <span className="font-normal text-[var(--text-muted)]">
                        · {order.items.length} item(ns)
                      </span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gold">
                      {formatPrice(order.total)}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${orderStatusClass(order.status)}`}
                    >
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* itens recentes */}
      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-wider text-gold">
            Itens recentes
          </p>
          <Link
            href="/admin/produtos"
            className="btn btn-ghost shrink-0 px-3 py-1.5 text-[11px]"
          >
            Ver todos
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Nenhum item cadastrado — comece em “Novo item”.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recent.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{product.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {formatPrice(product.price)} · estoque {product.stock}
                  </p>
                </div>
                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="btn btn-ghost shrink-0 px-3 py-1.5 text-[11px]"
                >
                  Editar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-[var(--text-muted)]">
        Módulos do painel (Documento de Correção §12): Dashboard, Produtos,
        Obras, Universos, Autores, Categorias, Coleções, Estoque, Pedidos,
        Clientes, E-books, Audiobooks, Biblioteca Digital, Pré-vendas, Cupons,
        Promoções, Cliffhanger Club, Avaliações, Banners, Home, Notícias,
        Lançamentos, Notificações, Relatórios, Financeiro e Configurações.
        Ativos hoje: Dashboard, Produtos, Banners e Cupons — os demais seguem o roadmap.
      </p>
    </div>
  );
}
