"use client";

import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminReport } from "@/components/admin/useAdminData";
import { SelectInput } from "@/components/admin/form-fields";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PAYMENT_LABEL } from "@/lib/order-fields";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

/**
 * §12 — Relatórios: vendas por período, top produtos, estoque, digital e
 * marketing — agregados somente leitura (comercial, marketing, financeiro
 * e administrador).
 */

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "365", label: "Últimos 12 meses" },
  { value: "0", label: "Desde sempre" },
];

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

export default function AdminReportsPage() {
  const { user } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const { report, error, loading, days, setDays } = useAdminReport();

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para ver os relatórios." />;
  }

  const allowed = roleLoading || can("reports.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">reports.view</code> — relatórios ficam com Comercial,
          Marketing, Financeiro e Administrador (§13).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Relatórios</p>
          <p className="text-xs text-[var(--text-muted)]">
            Vendas, produtos, estoque, digital e marketing — somente leitura (§12)
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

      {loading && <p className="text-sm text-[var(--text-muted)]">Gerando relatório…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Pedidos" value={String(report.sales.orders)} />
            <Kpi label="Receita" value={formatPrice(report.sales.revenue)} accent />
            <Kpi label="Ticket médio" value={formatPrice(report.sales.avgTicket)} />
            <Kpi label="Descontos" value={formatPrice(report.sales.discounts)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card space-y-2 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Pedidos por status
              </p>
              {Object.keys(report.sales.byStatus).length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Sem pedidos no período.</p>
              )}
              {Object.entries(report.sales.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-3 text-xs">
                  <span>
                    {ORDER_STATUS_LABEL[status as OrderStatus] ?? PAYMENT_LABEL[status as "pix"] ?? status}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${Math.round((count / Math.max(1, report.sales.orders)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-bold">{count}</span>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(report.sales.byPayment).map(([method, count]) => (
                  <Label key={method}>
                    {PAYMENT_LABEL[method as "pix"] ?? method}: {count}
                  </Label>
                ))}
              </div>
            </div>

            <div className="card space-y-2 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Top produtos (por unidades)
              </p>
              {report.topProducts.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Sem vendas no período.</p>
              )}
              {report.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate">
                    {index + 1}. {product.title}
                  </span>
                  <span className="shrink-0 font-bold">
                    {product.qty} un. · {formatPrice(product.revenue)}
                  </span>
                </div>
              ))}
            </div>

            <div className="card space-y-2 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Estoque
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Label>{report.stock.skus} SKUs</Label>
                <Label>{report.stock.units} unidades</Label>
                <Label tone="border-gold/50 bg-gold/10 text-gold">{report.stock.low} baixo(s)</Label>
                <Label tone={report.stock.out > 0 ? "border-[#e5484d]/50 text-[#e5484d]" : undefined}>
                  {report.stock.out} esgotado(s)
                </Label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Detalhe por produto no módulo Estoque.
              </p>
            </div>

            <div className="card space-y-2 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Digital e marketing
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Label>{report.digital.libraries} bibliotecas</Label>
                <Label>{report.digital.items} itens concedidos</Label>
                <Label>
                  progresso médio{" "}
                  {report.digital.withProgress > 0
                    ? `${Math.round(report.digital.avgProgress)}%`
                    : "—"}
                </Label>
                <Label>{report.marketing.couponsActive} cupons ativos</Label>
                <Label>{report.marketing.couponsUsed} usos de cupom</Label>
                <Label>{report.marketing.promotionsActive} campanhas ativas</Label>
                <Label>
                  avaliações{" "}
                  {report.marketing.reviewsAvg > 0
                    ? `${report.marketing.reviewsAvg.toFixed(1).replace(".", ",")}★`
                    : "—"}{" "}
                  ({report.marketing.reviewsPending} pendentes)
                </Label>
                <Label>{report.marketing.notificationsSent} notificações enviadas</Label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
