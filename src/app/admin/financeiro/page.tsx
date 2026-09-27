"use client";

import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminFinance } from "@/components/admin/useAdminData";
import { SelectInput } from "@/components/admin/form-fields";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PAYMENT_LABEL } from "@/lib/order-fields";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

/**
 * §12 — Financeiro: receita, pendências, cancelamentos e lançamentos por
 * pedido (comercial, financeiro e administrador). Somente leitura — não
 * há `finance.edit` na matriz §13; o dinheiro nasce do checkout (§17).
 */

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "365", label: "Últimos 12 meses" },
  { value: "0", label: "Desde sempre" },
];

function when(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function Label({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
        tone ?? "border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      {children}
    </span>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`text-lg font-bold ${accent ? "text-gold" : ""}`}>{value}</p>
    </div>
  );
}

export default function AdminFinancePage() {
  const { user } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const { finance, error, loading, days, setDays } = useAdminFinance();

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para ver o financeiro." />;
  }

  const allowed = roleLoading || can("finance.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">finance.view</code> — o financeiro fica com Comercial,
          Financeiro e Administrador (§13).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Financeiro</p>
          <p className="text-xs text-[var(--text-muted)]">
            Receita, pendências e cancelamentos sobre os pedidos — somente leitura (§12)
          </p>
        </div>
        <div className="w-64">
          <SelectInput
            value={String(days)}
            options={PERIODS}
            onChange={(v) => setDays(Number(v))}
          />
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Lendo o financeiro…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {finance && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Receita" value={formatPrice(finance.revenue)} accent />
            <Kpi label="Aguardando pagamento" value={formatPrice(finance.pending)} />
            <Kpi
              label="Cancelados"
              value={`${finance.cancelledOrders} · ${formatPrice(finance.cancelledValue)}`}
            />
            <Kpi label="Ticket médio" value={formatPrice(finance.avgTicket)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card space-y-2 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Receita por meio de pagamento
              </p>
              {Object.keys(finance.byMethod).length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Sem receita no período.</p>
              )}
              {Object.entries(finance.byMethod).map(([method, data]) => (
                <div key={method} className="flex items-center justify-between gap-3 text-xs">
                  <span>{PAYMENT_LABEL[method as "pix"] ?? method}</span>
                  <span className="shrink-0 font-bold">
                    {data.orders} pedido(s) · {formatPrice(data.revenue)}
                  </span>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Label>descontos {formatPrice(finance.discounts)}</Label>
                <Label>frete {formatPrice(finance.shipping)}</Label>
              </div>
            </div>

            <div className="card space-y-2 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Lançamentos ({finance.entries.length})
              </p>
              {finance.entries.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Sem pedidos no período.</p>
              )}
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {finance.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {entry.code} · {entry.customer}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        {when(entry.createdAt)} · {ORDER_STATUS_LABEL[entry.status as OrderStatus] ?? entry.status} ·{" "}
                        {PAYMENT_LABEL[entry.paymentMethod as "pix"] ?? entry.paymentMethod}
                        {entry.discount > 0 ? ` · desconto ${formatPrice(entry.discount)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-gold">{formatPrice(entry.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
