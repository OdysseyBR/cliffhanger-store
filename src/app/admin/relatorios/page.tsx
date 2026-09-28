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
 * §36 — Relatórios: as 17 áreas do documento (vendas, produtos, estoque,
 * clientes, pedidos, Cliffhanger+, cancelamentos, pré-vendas, Drops,
 * biblioteca digital, e-books, audiobooks, Clube do Leitor, campanhas,
 * cupons, wishlist e conversão) sempre sobre dados reais — a definição de
 * conversão vai identificada no card. Abaixo, o painel de integração da
 * §37 (conta × site × app × admin). Somente leitura (§12).
 */

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "365", label: "Últimos 12 meses" },
  { value: "0", label: "Desde sempre" },
];

/** §36 — cobertura completa: 17 áreas. */
const COVER = [
  "Vendas",
  "Produtos",
  "Estoque",
  "Clientes",
  "Pedidos",
  "Cliffhanger+",
  "Cancelamentos",
  "Pré-vendas",
  "Drops",
  "Biblioteca digital",
  "E-books",
  "Audiobooks",
  "Clube do Leitor",
  "Campanhas",
  "Cupons",
  "Wishlist",
  "Conversão",
];

const PLAN_LABEL: Record<string, string> = {
  essential: "Essential",
  gold: "Gold",
  premium: "Premium",
};

function pct(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function isoDate(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
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

function Kpi({ label, value, accent, hint }: { label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`text-lg font-bold ${accent ? "text-gold" : ""}`}>{value}</p>
      {hint && <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3 p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </p>
        {note && <p className="text-[11px] text-[var(--text-muted)]">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function Bar({ value, total }: { value: number; total: number }) {
  return (
    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-raised)]">
      <div
        className="h-full rounded-full bg-gold"
        style={{ width: `${Math.round((value / Math.max(1, total)) * 100)}%` }}
      />
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
            17 áreas da §36 sobre dados reais + integração conta/site/app/admin (§37) — somente
            leitura
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

      {/* §36 — cobertura */}
      <div className="card flex flex-wrap items-center gap-1.5 p-3">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gold">
          §36 · 17 áreas
        </span>
        {COVER.map((area) => (
          <Label key={area}>{area}</Label>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Gerando relatório…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {report && (
        <>
          {/* vendas / clientes / plus */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Pedidos" value={String(report.sales.orders)} />
            <Kpi label="Receita" value={formatPrice(report.sales.revenue)} accent />
            <Kpi label="Ticket médio" value={formatPrice(report.sales.avgTicket)} />
            <Kpi label="Descontos" value={formatPrice(report.sales.discounts)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Clientes" value={String(report.clients.total)} hint={`${report.clients.registered} cadastrados`} />
            <Kpi label="Novos no período" value={String(report.clients.newInPeriod)} hint="primeiro pedido no período" />
            <Kpi label="Compradores pagos" value={String(report.clients.buyers)} hint="no período" />
            <Kpi
              label="Cancelamentos"
              value={`${report.cancellations.orders} · ${pct(report.cancellations.rate)}`}
              hint={formatPrice(report.cancellations.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Assinantes Cliffhanger+" value={String(report.plus.subscribers)} hint={`${report.plus.cancelled} cancelada(s)`} />
            <Kpi label="Receita mensal simulada" value={formatPrice(report.plus.mrr)} accent hint="soma dos planos ativos (§17)" />
            <Kpi
              label="Drops · resgates"
              value={`${report.plus.drops} · ${report.plus.claims}`}
              hint={`${report.plus.claimsTemp} temporário(s) · ${report.plus.claimsPerma} permanente(s)`}
            />
            <Kpi
              label="Conversão"
              value={pct(report.conversion.paidRate)}
              accent
              hint={`${report.conversion.ordersPaid}/${report.conversion.ordersPlaced} pedidos pagos`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* pedidos */}
            <Section title="Pedidos por status" note="§36 — pedidos">
              {Object.keys(report.sales.byStatus).length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Sem pedidos no período.</p>
              )}
              {Object.entries(report.sales.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-3 text-xs">
                  <span>
                    {ORDER_STATUS_LABEL[status as OrderStatus] ?? PAYMENT_LABEL[status as "pix"] ?? status}
                  </span>
                  <div className="flex items-center gap-2">
                    <Bar value={count} total={report.sales.orders} />
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
            </Section>

            {/* clientes */}
            <Section title="Clientes" note="§36 — top compradores do período">
              {report.clients.top.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Sem compradores no período.</p>
              )}
              {report.clients.top.map((client, index) => (
                <div key={client.email} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate">
                    {index + 1}. {client.name || client.email}
                    <span className="ml-2 text-[var(--text-muted)]">{client.orders} pedido(s)</span>
                  </span>
                  <span className="shrink-0 font-bold">{formatPrice(client.spent)}</span>
                </div>
              ))}
              <p className="text-xs text-[var(--text-muted)]">
                {report.clients.total} cliente(s) no total · {report.clients.newInPeriod} com o
                primeiro pedido no período.
              </p>
            </Section>

            {/* produtos */}
            <Section title="Top produtos (por unidades)" note="§36 — produtos">
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
            </Section>

            {/* estoque */}
            <Section title="Estoque" note="§36 — estoque">
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
            </Section>

            {/* cancelamentos */}
            <Section title="Cancelamentos" note="§36 — cancelamentos no período">
              <div className="flex flex-wrap gap-1.5">
                <Label tone="border-[#e5484d]/50 text-[#e5484d]">{report.cancellations.orders} pedido(s)</Label>
                <Label>{formatPrice(report.cancellations.value)} em valor</Label>
                <Label>{pct(report.cancellations.rate)} dos pedidos</Label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Valor não entra na receita; descontos e frete de cancelados também são excluídos.
              </p>
            </Section>

            {/* pré-vendas */}
            <Section title="Pré-vendas" note="§36 — lançamentos e unidades reservadas">
              <div className="flex flex-wrap gap-1.5">
                <Label tone="border-gold/50 bg-gold/10 text-gold">{report.preorders.launches} lançamento(s) em pré-venda</Label>
                <Label>{report.preorders.products} produto(s) com selo PRÉ-VENDA</Label>
                <Label>{report.preorders.reservedUnits} unidade(s) reservada(s) (§14)</Label>
                <Label>
                  {report.preorders.soldUnits} vendida(s) · {formatPrice(report.preorders.revenue)}
                </Label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Vendas contam produtos com selo PRÉ-VENDA no período; reservas vêm do estoque.
              </p>
            </Section>

            {/* Cliffhanger+ */}
            <Section title="Cliffhanger+" note="§36 — assinaturas (cobrança simulada §17)">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(report.plus.byPlan).map(([plan, count]) => (
                  <Label key={plan} tone={count > 0 ? "border-gold/50 bg-gold/10 text-gold" : undefined}>
                    {PLAN_LABEL[plan] ?? plan}: {count}
                  </Label>
                ))}
                <Label>{report.plus.subscribers} ativa(s)</Label>
                <Label>{report.plus.cancelled} cancelada(s)</Label>
                <Label>{formatPrice(report.plus.mrr)}/mês</Label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Totais atuais (não dependem do período do seletor).
              </p>
            </Section>

            {/* Drops */}
            <Section title="Drops" note="§36 — conteúdo mensal do Cliffhanger+ (§25)">
              <div className="flex flex-wrap gap-1.5">
                <Label>{report.plus.drops} drop(s)</Label>
                <Label tone="border-gold/50 bg-gold/10 text-gold">{report.plus.dropsActive} ativo(s)</Label>
                <Label>{report.plus.claims} resgate(s)</Label>
                <Label>{report.plus.claimsTemp} temporário(s)</Label>
                <Label>{report.plus.claimsPerma} permanente(s)</Label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Temporário some no cancelamento; permanente fica na biblioteca (§25).
              </p>
            </Section>

            {/* biblioteca digital */}
            <Section title="Biblioteca digital" note="§36 — bibliotecas e progresso">
              <div className="flex flex-wrap gap-1.5">
                <Label>{report.digital.libraries} bibliotecas</Label>
                <Label>{report.digital.items} itens concedidos</Label>
                <Label>
                  progresso médio{" "}
                  {report.digital.withProgress > 0 ? pct(report.digital.avgProgress) : "—"}
                </Label>
                <Label>{report.digital.withProgress} registro(s) de progresso</Label>
              </div>
            </Section>

            {/* e-books e audiobooks */}
            <Section title="E-books e Audiobooks" note="§36 — catálogo e vendas por formato">
              {(["ebooks", "audiobooks", "physical"] as const).map((key) => {
                const row = report.formats[key];
                const name = key === "ebooks" ? "E-books" : key === "audiobooks" ? "Audiobooks" : "Físicos";
                return (
                  <div key={key} className="flex items-center justify-between gap-3 text-xs">
                    <span>{name}</span>
                    <span className="font-bold">
                      {row.products} produto(s) · {row.soldUnits} vendido(s) ·{" "}
                      {formatPrice(row.revenue)}
                    </span>
                  </div>
                );
              })}
            </Section>

            {/* Clube do Leitor / Club */}
            <Section
              title="Clube do Leitor e Cliffhanger Club"
              note="§36 — caixas (§26) e pontos (§18)"
            >
              <div className="flex flex-wrap gap-1.5">
                <Label>{report.readerClub.boxes} caixa(s)</Label>
                <Label>{report.readerClub.planned} planejada(s)</Label>
                <Label tone="border-gold/50 bg-gold/10 text-gold">
                  {report.readerClub.preparing} em preparo
                </Label>
                <Label>{report.readerClub.shipped} enviada(s)</Label>
                <Label>{report.readerClub.members} membro(s) do clube</Label>
                <Label>{report.readerClub.points} ponto(s)</Label>
                <Label>
                  {report.readerClub.benefits} benefício(s) · {report.readerClub.benefitsActive} ativo(s)
                </Label>
              </div>
            </Section>

            {/* campanhas e cupons */}
            <Section title="Campanhas e cupons" note="§36 — campanhas, cupons, avaliações e notificações">
              <div className="flex flex-wrap gap-1.5">
                <Label tone="border-gold/50 bg-gold/10 text-gold">
                  {report.marketing.promotionsActive} campanha(s) ativa(s)
                </Label>
                <Label>{report.marketing.promotionsScheduled} agendada(s)</Label>
                <Label>{report.marketing.promotionsTotal} no total</Label>
                <Label>{report.marketing.couponsActive} cupons ativos</Label>
                <Label>{report.marketing.couponsUsed} usos de cupom</Label>
                <Label>
                  avaliações{" "}
                  {report.marketing.reviewsAvg > 0
                    ? `${report.marketing.reviewsAvg.toFixed(1).replace(".", ",")}★`
                    : "—"}{" "}
                  ({report.marketing.reviewsPending} pendentes)
                </Label>
                <Label>{report.marketing.notificationsSent} notificações enviadas</Label>
              </div>
            </Section>

            {/* wishlist */}
            <Section title="Wishlist" note="§36 — desejos salvos pelos clientes">
              <div className="flex flex-wrap gap-1.5">
                <Label>{report.wishlist.users} conta(s) com wishlist</Label>
                <Label>{report.wishlist.items} item(ns) salvo(s)</Label>
              </div>
              {report.wishlist.top.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Nenhum item na wishlist ainda.</p>
              ) : (
                report.wishlist.top.map((item, index) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate">
                      {index + 1}. {item.title}
                    </span>
                    <span className="shrink-0 font-bold">{item.saves} desejo(s)</span>
                  </div>
                ))
              )}
            </Section>

            {/* conversão */}
            <Section title="Conversão" note="§36 — definição identificada, sem estimativa">
              <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                {report.conversion.definition}
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    Pedidos: {report.conversion.ordersPaid} pagos de{" "}
                    {report.conversion.ordersPlaced} criados
                  </span>
                  <div className="flex items-center gap-2">
                    <Bar value={report.conversion.ordersPaid} total={report.conversion.ordersPlaced} />
                    <span className="font-bold">{pct(report.conversion.paidRate)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>
                    Contas: {report.conversion.registeredBuyers} compradoras de{" "}
                    {report.conversion.registered} cadastradas
                  </span>
                  <div className="flex items-center gap-2">
                    <Bar
                      value={report.conversion.registeredBuyers}
                      total={report.conversion.registered}
                    />
                    <span className="font-bold">{pct(report.conversion.buyerRate)}</span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ---------------- §37 — integração ---------------- */}
          <div className="card space-y-4 p-5">
            <div>
              <p className="text-display text-2xl text-gold">Integração entre conta, site, app e admin</p>
              <p className="text-xs text-[var(--text-muted)]">
                §37 — as quatro áreas não são sistemas independentes: a conta do usuário é o elo
                central e os dados abaixo vêm todos do mesmo banco.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Web</p>
                <p className="text-xs text-[var(--text-muted)]">Comércio · Catálogo · Checkout · Conteúdo · Campanhas</p>
                <p className="mt-2 text-sm font-bold">
                  {report.integration.web.orders} pedido(s) · {report.integration.web.customers}{" "}
                  cliente(s)
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">App</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Experiência · Biblioteca · Leitor · Audiobook · Coleção · Scanner · QR Codes · Cliffhanger+
                </p>
                <p className="mt-2 text-sm font-bold">
                  {report.integration.app.content
                    ? `conteúdo publicado · ${report.integration.app.highlights} destaque(s)${report.integration.app.scanner ? " · scanner" : ""}`
                    : "conteúdo ainda não publicado (§33)"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Admin</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Operação · Produtos · Estoque · Pedidos · Clientes · Cliffhanger+ · Conteúdo · Relatórios
                </p>
                <p className="mt-2 text-sm font-bold">
                  {report.integration.admin.users} usuário(s) · {report.integration.admin.auditLogs}{" "}
                  registro(s) de auditoria
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                Conta do usuário — dados e experiências compartilhados
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                O usuário entra pelo site ou aplicativo e encontra os mesmos dados fundamentais;
                cada um é controlado no painel pela permissão do módulo correspondente.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: "Conta", value: `${report.integration.web.customers} cadastro(s)` },
                {
                  label: "Pedidos",
                  value: `${report.integration.web.orders} pedido(s)`,
                },
                {
                  label: "Biblioteca",
                  value: `${report.integration.account.libraries} biblioteca(s) · ${report.integration.account.libraryItems} item(ns)`,
                },
                {
                  label: "Coleção",
                  value: `${report.integration.account.collectionItems} produto(s) adquirido(s)`,
                },
                {
                  label: "Wishlist",
                  value: `${report.integration.account.wishlistUsers} conta(s) · ${report.integration.account.wishlistItems} item(ns)`,
                },
                {
                  label: "Cliffhanger+",
                  value: `${report.integration.account.plusActive} assinatura(s) ativa(s)`,
                },
                {
                  label: "Progresso de leitura",
                  value: `${report.integration.account.reading.entries} registro(s) · ${report.integration.account.reading.entries > 0 ? pct(report.integration.account.reading.avgPercent) : "—"}`,
                },
                {
                  label: "Progresso de audiobook",
                  value: `${report.integration.account.listening.entries} registro(s) · ${report.integration.account.listening.entries > 0 ? pct(report.integration.account.listening.avgPercent) : "—"}`,
                },
                {
                  label: "Benefícios",
                  value: `${report.integration.account.benefits} ativo(s)`,
                },
                {
                  label: "Histórico",
                  value: `${report.integration.account.historyOrders} pedido(s) · último ${isoDate(report.integration.account.lastOrderAt)}`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <span className="text-xs font-bold">{row.label}</span>
                  <span className="text-right text-xs text-[var(--text-muted)]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            Todos os números vêm de coleções reais do sistema — nada é estimado ou fictício
            (§36). O seletor de período vale para vendas, clientes, cancelamentos, pré-vendas e
            formatos; totais de catálogo, assinaturas, drops e integração são atuais.
          </p>
        </>
      )}
    </div>
  );
}
