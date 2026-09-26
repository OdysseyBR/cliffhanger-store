"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminLaunches } from "@/components/admin/useAdminLaunches";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import {
  Card,
  DateInput,
  DateTimeInput,
  Field,
  NumberInput,
  TextInput,
} from "@/components/admin/form-fields";
import { Countdown } from "@/components/Countdown";
import {
  BLANK_LAUNCH_FORM,
  sanitizeLaunchInput,
  toLaunchForm,
  type LaunchFormState,
} from "@/lib/launch-fields";
import type { Launch, LaunchLot, Product } from "@/lib/types";

/**
 * Módulo Pré-vendas do painel (Documento de Correção §12/§15): data de
 * lançamento, countdown, lotes, estoque dos produtos exclusivos,
 * notificação na data e previsão de envio.
 */

function when(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
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

export default function AdminPreOrdersPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const launches = useAdminLaunches();
  const { products } = useAdminProducts();

  const [editing, setEditing] = useState<Launch | "novo" | null>(null);
  const [form, setForm] = useState<LaunchFormState>(BLANK_LAUNCH_FORM);
  const [productFilter, setProductFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof LaunchFormState>(key: K, value: LaunchFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateLot = (index: number, patch: Partial<LaunchLot>) =>
    setForm((prev) => ({
      ...prev,
      lots: prev.lots.map((lot, i) => (i === index ? { ...lot, ...patch } : lot)),
    }));

  const addLot = () =>
    setForm((prev) => ({
      ...prev,
      lots: [
        ...prev.lots,
        { name: `Lote ${prev.lots.length + 1}`, qty: (prev.lots.at(-1)?.qty ?? 100) * 2 },
      ],
    }));

  const removeLot = (index: number) =>
    setForm((prev) => ({ ...prev, lots: prev.lots.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    const existing = editing && editing !== "novo" ? editing : null;
    const parsed = sanitizeLaunchInput({ ...form, id: existing?.id ?? "" }, existing);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }

    const result = await launches.save(parsed.launch, editing === "novo");
    if (result.ok) {
      notify(
        editing === "novo"
          ? `Pré-venda “${parsed.launch.title}” criada.`
          : `Pré-venda “${parsed.launch.title}” atualizada.`,
        "success",
      );
      setEditing(null);
      setForm(BLANK_LAUNCH_FORM);
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (launch: Launch) => {
    if (!window.confirm(`Excluir a pré-venda “${launch.title}”? A página pública deixa de existir.`)) {
      return;
    }
    setBusyId(launch.id);
    const result = await launches.remove(launch.id);
    setBusyId(null);
    if (result.ok) notify("Pré-venda excluída.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar as pré-vendas." />;
  }

  const allowed = roleLoading || can("preorders.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">preorders.view</code> — pré-vendas são restritas aos papéis
          Administrador e Editorial (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("preorders.edit");
  const items = launches.items ?? [];
  const list = items.slice().sort((a, b) => String(b.releaseDate).localeCompare(String(a.releaseDate)));
  const allProducts = products ?? [];

  const visibleProducts = allProducts.filter((product) =>
    product.title.toLowerCase().includes(productFilter.trim().toLowerCase()),
  );

  const totals = {
    launches: items.length,
    preOrder: items.filter((l) => l.preOrder).length,
    lots: items.reduce((sum, l) => sum + (l.lots?.length ?? 0), 0),
    linked: items.reduce((sum, l) => sum + (l.productIds?.length ?? 0), 0),
  };

  const linkedProducts = allProducts.filter((product) => form.productIds.includes(product.id));
  const linkedStock = linkedProducts.reduce((sum, product) => sum + Number(product.stock ?? 0), 0);
  const lotQty = form.lots.reduce((sum, lot) => sum + Number(lot.qty ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Pré-vendas</p>
          <p className="text-xs text-[var(--text-muted)]">
            Data de lançamento, countdown, lotes, estoque dos produtos exclusivos, notificação e
            previsão de envio (§15)
            {launches.items ? ` · ${totals.launches} lançamento(s)` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setEditing("novo");
              setForm(BLANK_LAUNCH_FORM);
            }}
          >
            Nova pré-venda
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Lançamentos
          </p>
          <p className="text-lg font-bold">{totals.launches}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Em pré-venda
          </p>
          <p className="text-lg font-bold text-gold">{totals.preOrder}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Lotes
          </p>
          <p className="text-lg font-bold">{totals.lots}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Produtos vinculados
          </p>
          <p className="text-lg font-bold">{totals.linked}</p>
        </div>
      </div>

      {editing && (
        <Card title={editing === "novo" ? "Nova pré-venda" : `Editar — ${form.title || "sem título"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput value={form.title} placeholder="Ex.: Valeharts III" onChange={(v) => set("title", v)} />
            </Field>
            <Field label="Slug (URL pública)" hint="A loja usa /lancamentos/&lt;slug&gt;. Vazio = gerado do título.">
              <TextInput
                value={form.slug}
                placeholder="valeharts-iii"
                onChange={(v) => set("slug", v)}
              />
            </Field>
            <Field label="Data e hora do lançamento" hint="Alimenta o countdown da página pública.">
              <DateTimeInput value={form.releaseDate} onChange={(v) => set("releaseDate", v)} />
            </Field>
            <Field label="Previsão de envio" hint="Comunicada ao cliente na pré-venda.">
              <DateInput value={form.shipForecast} onChange={(v) => set("shipForecast", v)} />
            </Field>
            <div className="flex flex-wrap items-end gap-5 pb-1 text-xs text-[var(--text-muted)]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.preOrder}
                  onChange={(event) => set("preOrder", event.target.checked)}
                />
                É pré-venda (reserva)
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notifyOnRelease}
                  onChange={(event) => set("notifyOnRelease", event.target.checked)}
                />
                Notificar assinantes na data
              </label>
            </div>
            <div className="pb-1 text-xs text-[var(--text-muted)]">
              <p className="mb-1 font-bold uppercase tracking-wider">Countdown</p>
              {form.releaseDate ? (
                <Countdown target={new Date(form.releaseDate).toISOString()} prefix="Lança em" doneLabel="Já lançou" />
              ) : (
                <span>Preencha a data para ver a contagem.</span>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Lotes ({form.lots.length} · {lotQty} un.)
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-[11px]"
                  onClick={addLot}
                  disabled={form.lots.length >= 12}
                >
                  Adicionar lote
                </button>
              )}
            </div>

            {form.lots.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Sem lotes — a pré-venda vende direto, sem janelas por volume.
              </p>
            )}

            <div className="space-y-2">
              {form.lots.map((lot, index) => (
                <div
                  key={`${lot.name}-${index}`}
                  className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:grid-cols-4"
                >
                  <Field label="Lote">
                    <TextInput value={lot.name} onChange={(v) => updateLot(index, { name: v })} />
                  </Field>
                  <Field label="Quantidade">
                    <NumberInput
                      value={lot.qty}
                      min={1}
                      onChange={(v) => updateLot(index, { qty: v })}
                    />
                  </Field>
                  <Field label="Preço (0 = sem preço)">
                    <NumberInput
                      value={lot.price ?? 0}
                      min={0}
                      step={0.01}
                      onChange={(v) => updateLot(index, { price: v || undefined })}
                    />
                  </Field>
                  <Field label="Encerra em">
                    <div className="flex items-center gap-2">
                      <DateInput
                        value={(lot.closesAt ?? "").slice(0, 10)}
                        onChange={(v) => updateLot(index, { closesAt: v || undefined })}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost px-2 py-2 text-[11px]"
                        onClick={() => removeLot(index)}
                        aria-label={`Remover lote ${lot.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </Field>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Produtos exclusivos ({form.productIds.length} · estoque {linkedStock} un.)
              </p>
              <div className="w-64">
                <TextInput
                  value={productFilter}
                  placeholder="Filtrar produtos"
                  onChange={setProductFilter}
                />
              </div>
            </div>

            <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product: Product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] p-2 text-xs hover:bg-[var(--surface-raised)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.productIds.includes(product.id)}
                    onChange={(event) =>
                      set(
                        "productIds",
                        event.target.checked
                          ? [...form.productIds, product.id]
                          : form.productIds.filter((id) => id !== product.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-[var(--text)]">
                      {product.title}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      estoque {Number(product.stock ?? 0)}
                      {product.badge === "PRÉ-VENDA" ? " · pré-venda" : ""}
                    </span>
                  </span>
                </label>
              ))}
              {visibleProducts.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Nenhum produto no filtro.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={launches.busy}
              onClick={() => void handleSave()}
            >
              {launches.busy ? "Gravando…" : "Salvar pré-venda"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing(null);
                setForm(BLANK_LAUNCH_FORM);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {launches.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando pré-vendas…</p>
      )}
      {launches.error && <p className="text-sm text-[#e5484d]">{launches.error}</p>}

      {!launches.loading && !launches.error && list.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma pré-venda cadastrada — crie a primeira com o botão “Nova pré-venda”.
        </p>
      )}

      {list.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {list.map((launch) => {
            const linked = allProducts.filter((product) =>
              (launch.productIds ?? []).includes(product.id),
            );
            const stock = linked.reduce((sum, product) => sum + Number(product.stock ?? 0), 0);
            return (
              <div key={launch.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gold">
                    {launch.title}
                    {launch.highlight ? ` — ${launch.highlight}` : ""}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    /lancamentos/{launch.slug} · {when(launch.releaseDate)} · envio previsto{" "}
                    {when(launch.shipForecast)} · {launch.lots?.length ?? 0} lote(s) ·{" "}
                    {launch.productIds?.length ?? 0} produto(s) · estoque {stock}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {launch.preOrder ? (
                      <Label tone="border-gold/50 bg-gold/10 text-gold">pré-venda</Label>
                    ) : (
                      <Label>venda direta</Label>
                    )}
                    {launch.notifyOnRelease && <Label tone="border-violet-soft/50 text-violet-soft">notifica</Label>}
                    <Label>countdown</Label>
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    <Countdown
                      target={new Date(launch.releaseDate).toISOString()}
                      prefix="Lança em"
                      doneLabel="Já lançou"
                    />
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      onClick={() => {
                        setEditing(launch);
                        setForm(toLaunchForm(launch));
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      disabled={busyId === launch.id}
                      onClick={() => void handleRemove(launch)}
                    >
                      {busyId === launch.id ? "Excluindo…" : "Excluir"}
                    </button>
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
