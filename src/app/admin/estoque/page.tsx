"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminStock } from "@/components/admin/useAdminStock";
import { Card, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/form-fields";
import {
  STOCK_KINDS,
  STOCK_KIND_LABELS,
  parseStockAdjust,
  type AdminStockItem,
} from "@/lib/stock-fields";
import type { StockKind, StockMovement } from "@/lib/types";

/**
 * Módulo Estoque do painel (Documento de Correção §12/§14):
 * estoque atual, reservado, disponível, mínimo, entradas, saídas, ajustes
 * com motivo, histórico e alerta de estoque baixo.
 */

interface AdjustForm {
  kind: StockKind;
  qty: number;
  reason: string;
  /** "" = manter o valor atual */
  minStock: string;
  reserved: string;
}

const BLANK: AdjustForm = { kind: "entrada", qty: 1, reason: "", minStock: "", reserved: "" };

const KIND_OPTIONS = STOCK_KINDS.map((value) => ({
  value,
  label: STOCK_KIND_LABELS[value],
}));

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

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-[70px]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`text-lg font-bold ${tone ?? "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

export default function AdminStockPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const stock = useAdminStock();

  const [target, setTarget] = useState<AdminStockItem | null>(null);
  const [form, setForm] = useState<AdjustForm>(BLANK);
  const [filter, setFilter] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [onlyOut, setOnlyOut] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const set = <K extends keyof AdjustForm>(key: K, value: AdjustForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdjust = async () => {
    if (!target) return;
    const parsed = parseStockAdjust({
      kind: form.kind,
      qty: form.qty,
      reason: form.reason,
      minStock: form.minStock.trim() === "" ? null : Number(form.minStock),
      reserved: form.reserved.trim() === "" ? null : Number(form.reserved),
    });
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }

    const result = await stock.adjust(target.id, parsed.input);
    if (result.ok) {
      notify(`Estoque de “${target.title}” atualizado — agora ${result.data.stock} un.`, "success");
      setTarget(null);
      setForm(BLANK);
      setHistoryId(null);
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar o estoque." />;
  }

  const allowed = roleLoading || can("stock.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">stock.view</code> — o estoque é restrito aos papéis
          Administrador e Estoque (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("stock.edit");
  const products = stock.products ?? [];
  const movements = stock.movements ?? [];

  // derivado da lista (poucos itens — sem memo para manter as regras de hook)
  const totals = {
    skus: products.length,
    units: products.reduce((sum, p) => sum + p.stock, 0),
    reserved: products.reduce((sum, p) => sum + p.reserved, 0),
    available: products.reduce((sum, p) => sum + p.available, 0),
    low: products.filter((p) => p.low).length,
    out: products.filter((p) => p.soldOut).length,
  };

  const needle = filter.trim().toLowerCase();
  const visible = products.filter((product) => {
    if (needle && !product.title.toLowerCase().includes(needle) && !product.slug.includes(needle)) {
      return false;
    }
    if (onlyLow && !product.low) return false;
    if (onlyOut && !product.soldOut) return false;
    return true;
  });

  const history = (historyId ? movements.filter((m) => m.productId === historyId) : movements).slice(
    0,
    40,
  );
  const historyTitle = historyId
    ? products.find((p) => p.id === historyId)?.title ?? historyId
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Estoque</p>
          <p className="text-xs text-[var(--text-muted)]">
            Atual, reservado, disponível e mínimo — entradas, saídas e ajustes com motivo
            {stock.products ? ` · ${totals.skus} SKU(s)` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4">
          <Stat label="Unidades" value={totals.units} />
        </div>
        <div className="card p-4">
          <Stat label="Reservado" value={totals.reserved} tone="text-orange-300" />
        </div>
        <div className="card p-4">
          <Stat label="Disponível" value={totals.available} tone="text-emerald-300" />
        </div>
        <div className="card p-4">
          <Stat label="Estoque baixo" value={totals.low} tone={totals.low ? "text-gold" : undefined} />
        </div>
        <div className="card p-4">
          <Stat label="Esgotados" value={totals.out} tone={totals.out ? "text-[#e5484d]" : undefined} />
        </div>
        <div className="card p-4">
          <Stat label="Produtos" value={totals.skus} />
        </div>
      </div>

      {target && (
        <Card title={`Movimentar estoque — ${target.title}`}>
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
            Atual <strong>{target.stock}</strong> · reservado <strong>{target.reserved}</strong> ·
            disponível <strong>{target.available}</strong> · mínimo{" "}
            <strong>{target.minStock || "—"}</strong>
            {target.low && <span className="ml-2 text-gold">· alerta de estoque baixo</span>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de movimento">
              <SelectInput value={form.kind} options={KIND_OPTIONS} onChange={(v) => set("kind", v as StockKind)} />
            </Field>
            <Field
              label={form.kind === "ajuste" ? "Novo estoque (valor absoluto)" : "Quantidade"}
              hint={
                form.kind === "saida"
                  ? "Máximo do disponível (estoque − reservado)."
                  : form.kind === "ajuste"
                    ? "Substitui o estoque atual pelo valor informado."
                    : "Unidades recebidas."
              }
            >
              <NumberInput value={form.qty} min={0} onChange={(v) => set("qty", v)} />
            </Field>
            <Field label="Estoque mínimo" hint="Deixe vazio para manter. 0 = sem alerta.">
              <TextInput
                value={form.minStock}
                placeholder={String(target.minStock)}
                onChange={(v) => set("minStock", v)}
              />
            </Field>
            <Field label="Reservados" hint="Deixe vazio para manter.">
              <TextInput
                value={form.reserved}
                placeholder={String(target.reserved)}
                onChange={(v) => set("reserved", v)}
              />
            </Field>
            <Field label="Motivo (obrigatório)" className="sm:col-span-2">
              <TextInput
                value={form.reason}
                placeholder="Ex.: reposição do fornecedor, inventário, avaria"
                onChange={(v) => set("reason", v)}
              />
            </Field>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={stock.busy}
              onClick={() => void handleAdjust()}
            >
              {stock.busy ? "Gravando…" : "Registrar movimento"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setTarget(null);
                setForm(BLANK);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <TextInput value={filter} placeholder="Filtrar produto pelo título ou slug" onChange={setFilter} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={onlyLow} onChange={() => setOnlyLow((v) => !v)} />
            Só estoque baixo
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={onlyOut} onChange={() => setOnlyOut((v) => !v)} />
            Só esgotados
          </label>
        </div>
      </div>

      {stock.loading && <p className="text-sm text-[var(--text-muted)]">Carregando estoque…</p>}
      {stock.error && <p className="text-sm text-[#e5484d]">{stock.error}</p>}

      {!stock.loading && !stock.error && visible.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Nenhum produto corresponde ao filtro.</p>
      )}

      {visible.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {visible.map((product) => (
            <div key={product.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">
                  {product.title}
                  {product.digital && (
                    <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      digital
                    </span>
                  )}
                  {product.low && (
                    <span className="ml-2 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                      estoque baixo
                    </span>
                  )}
                  {product.soldOut && (
                    <span className="ml-2 rounded-full border border-[#e5484d]/50 bg-[#e5484d]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e5484d]">
                      esgotado
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-5">
                  <Stat label="Atual" value={product.stock} />
                  <Stat label="Reservado" value={product.reserved} tone="text-orange-300" />
                  <Stat label="Disponível" value={product.available} tone="text-emerald-300" />
                  <Stat label="Mínimo" value={product.minStock} />
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setTarget(product);
                      setForm({ ...BLANK, minStock: "", reserved: "" });
                    }}
                  >
                    Movimentar
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  onClick={() => setHistoryId(historyId === product.id ? null : product.id)}
                >
                  {historyId === product.id ? "Todo o histórico" : "Histórico"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card
        title={
          historyTitle
            ? `Histórico de ${historyTitle} (${history.length})`
            : `Histórico de movimentações (${history.length})`
        }
      >
        {history.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">
            Nenhuma movimentação registrada ainda — entradas, saídas e ajustes aparecem aqui com
            motivo, autor e saldos.
          </p>
        )}
        <div className="space-y-2">
          {history.map((movement: StockMovement) => (
            <div
              key={movement.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-xs"
            >
              <p className="font-bold text-[var(--text)]">
                {STOCK_KIND_LABELS[movement.kind]} · {movement.productTitle}
                <span className="ml-2 font-normal text-[var(--text-muted)]">{when(movement.at)}</span>
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                saldo {movement.before} → <strong className="text-gold">{movement.after}</strong> ·
                motivo: {movement.reason} · por {movement.actor}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
