"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { ImageField } from "@/components/admin/ImageField";
import {
  Card,
  Field,
  MonthInput,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { useAdminPlusClub } from "@/components/admin/useAdminPlus";
import { sanitizeClubBoxInput, toClubBoxForm, blankClubBoxForm, type ClubBoxForm } from "@/lib/plus-fields";
import type { ClubBox, PlusPlanId } from "@/lib/plus-fields";

/**
 * §26 — Clube do Leitor no painel: criar e controlar as caixas mensais
 * (conjunto de produtos, período, elegibilidade e status operacional),
 * sabendo quantas caixas precisam ser preparadas.
 */

const PLAN_LABEL: Record<PlusPlanId, string> = {
  essential: "Essential",
  gold: "Gold",
  premium: "Premium",
};

const STATUS_LABEL: Record<ClubBox["status"], string> = {
  planejada: "planejada",
  em_preparo: "em preparo",
  enviada: "enviada",
};

type Editing = { mode: "novo" } | { mode: "editar"; box: ClubBox } | null;

export default function AdminPlusClubPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const club = useAdminPlusClub();

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<ClubBoxForm>(blankClubBoxForm);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof ClubBoxForm>(key: K, value: ClubBoxForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleProduct = (id: string) =>
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((value) => value !== id)
        : [...prev.productIds, id],
    }));

  const togglePlan = (plan: PlusPlanId) =>
    setForm((prev) => ({
      ...prev,
      eligibility: prev.eligibility.includes(plan)
        ? prev.eligibility.filter((value) => value !== plan)
        : [...prev.eligibility, plan],
    }));

  const handleSave = async () => {
    const parsed = sanitizeClubBoxInput(form, editing?.mode === "editar" ? editing.box : null);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const isNew = editing?.mode === "novo";
    const result = await club.save(parsed.item, isNew);
    if (result.ok) {
      notify(isNew ? `Caixa “${parsed.item.title}” criada.` : "Caixa atualizada.", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (box: ClubBox) => {
    if (!window.confirm(`Excluir a caixa “${box.title}” (${box.month})?`)) return;
    setBusyId(box.id);
    const result = await club.remove(box.id);
    setBusyId(null);
    if (result.ok) notify("Caixa excluída.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return (
      <AdminLogin note="Entre com a conta administradora para gerenciar o Clube do Leitor." />
    );
  }

  const allowed = roleLoading || can("plus.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">plus.view</code> — o Cliffhanger+ fica com Administrador e
          Marketing (edição) e Comercial/Atendimento (leitura) (§35).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("plus.edit");
  const items = club.items ?? [];
  const produtos = club.options?.produtos ?? [];

  const counts = {
    planejada: items.filter((box) => box.status === "planejada").length,
    em_preparo: items.filter((box) => box.status === "em_preparo").length,
    enviada: items.filter((box) => box.status === "enviada").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Clube do Leitor</p>
          <p className="text-xs text-[var(--text-muted)]">
            Caixas mensais do programa — conteúdo, elegibilidade e operação (§26)
            {club.items ? ` · ${items.length} caixa(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlusTabs active="clube" />
          {canEdit && !editing && (
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing({ mode: "novo" });
                setForm(blankClubBoxForm());
              }}
            >
              Nova caixa
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Planejadas
          </p>
          <p className="mt-1 text-2xl font-bold">{club.items ? counts.planejada : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">aguardando definição</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Precisam ser preparadas
          </p>
          <p className="mt-1 text-2xl font-bold text-gold">
            {club.items ? counts.em_preparo : "—"}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">em preparo agora</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Enviadas
          </p>
          <p className="mt-1 text-2xl font-bold">{club.items ? counts.enviada : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">entregues no mês</p>
        </div>
      </div>

      {editing && (
        <Card title={editing.mode === "novo" ? "Nova caixa" : `Editar — ${editing.box.title}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mês de referência">
              <MonthInput value={form.month} onChange={(value) => set("month", value)} />
            </Field>
            <Field label="Título">
              <TextInput
                value={form.title}
                placeholder="Ex.: Caixa Outubro 2026"
                onChange={(value) => set("title", value)}
              />
            </Field>
            <Field label="Descrição">
              <TextArea
                value={form.description}
                rows={3}
                placeholder="O que vem na caixa deste mês."
                onChange={(value) => set("description", value)}
              />
            </Field>
            <Field label="Status operacional" hint="Controla o que precisa ser preparado (§26).">
              <SelectInput
                value={form.status}
                options={[
                  { value: "planejada", label: "Planejada" },
                  { value: "em_preparo", label: "Em preparo" },
                  { value: "enviada", label: "Enviada" },
                ]}
                onChange={(value) => set("status", value as ClubBoxForm["status"])}
              />
            </Field>
            <div className="pb-1 text-xs text-[var(--text-muted)]">
              <p className="mb-1 font-bold uppercase tracking-wider">Elegibilidade</p>
              <div className="flex flex-wrap gap-4">
                {(Object.keys(PLAN_LABEL) as PlusPlanId[]).map((plan) => (
                  <label key={plan} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.eligibility.includes(plan)}
                      onChange={() => togglePlan(plan)}
                    />
                    {PLAN_LABEL[plan]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <ImageField
                label="Imagem da caixa"
                value={form.image}
                onChange={(url) => set("image", url)}
              />
            </div>
            <div className="text-xs text-[var(--text-muted)] sm:col-span-2">
              <p className="mb-1 font-bold uppercase tracking-wider">
                Produtos da caixa ({form.productIds.length})
              </p>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
                {produtos.length === 0 && (
                  <p className="text-[var(--text-muted)]">Catálogo indisponível.</p>
                )}
                {produtos.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                    <span className="truncate">{product.title}</span>
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      {product.type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={club.busy}
              onClick={() => void handleSave()}
            >
              {club.busy ? "Gravando…" : "Salvar caixa"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {club.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando caixas do Clube do Leitor…</p>
      )}
      {club.error && <p className="text-sm text-[#e5484d]">{club.error}</p>}

      {!club.loading && !club.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma caixa cadastrada — crie a primeira com “Nova caixa”.
        </p>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {items.map((box) => (
            <div key={box.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">
                  {box.month} · {box.title}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {box.productIds.length} produto(s) ·{" "}
                  {box.eligibility.map((plan) => PLAN_LABEL[plan]).join(", ")}
                  {box.description ? ` · ${box.description}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      box.status === "enviada"
                        ? "border-gold/50 bg-gold/10 text-gold"
                        : box.status === "em_preparo"
                          ? "border-violet-soft/50 text-violet-soft"
                          : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {STATUS_LABEL[box.status]}
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setEditing({ mode: "editar", box });
                      setForm(toClubBoxForm(box));
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                    disabled={club.busy || busyId === box.id}
                    onClick={() => void handleRemove(box)}
                  >
                    {busyId === box.id ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
