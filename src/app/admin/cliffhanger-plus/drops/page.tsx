"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { ImageField } from "@/components/admin/ImageField";
import {
  Card,
  DateTimeInput,
  Field,
  MonthInput,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { useAdminPlusDrops } from "@/components/admin/useAdminPlus";
import { formatDate } from "@/lib/format";
import {
  blankDropForm,
  sanitizeDropInput,
  toDropForm,
  type AdminDropRow,
  type DropForm,
} from "@/lib/plus-fields";

/**
 * §25 — Drops no painel: ferramenta específica para configurar Drops
 * (conteúdo, plano, período, imagem, descrição e disponibilidade) e para
 * acompanhar quem resgatou cada um, mantendo temporário × permanente.
 */

const PLAN_LABEL = { essential: "Essential", gold: "Gold", premium: "Premium" } as const;
const KIND_LABEL = { ebook: "E-book", audiobook: "Audiobook", obra: "Obra" } as const;

type Editing = { mode: "novo" } | { mode: "editar"; drop: AdminDropRow } | null;

function when(iso: string): string {
  if (!iso) return "sem janela";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export default function AdminPlusDropsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const drops = useAdminPlusDrops();

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<DropForm>(blankDropForm);
  const [openClaims, setOpenClaims] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof DropForm>(key: K, value: DropForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const contentOptions = (() => {
    const options = drops.options;
    if (!options) return [];
    if (form.kind === "obra") {
      return options.obras.map((obra) => ({ value: obra.slug, label: obra.title }));
    }
    const wanted = form.kind === "audiobook" ? "audiobook" : "ebook";
    return options.produtos
      .filter((product) => product.type === wanted)
      .map((product) => ({ value: product.id, label: product.title }));
  })();

  const handleSave = async () => {
    const parsed = sanitizeDropInput(form, editing?.mode === "editar" ? editing.drop : null);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const isNew = editing?.mode === "novo";
    const result = await drops.save(parsed.item, isNew);
    if (result.ok) {
      notify(isNew ? `Drop “${parsed.item.title}” criado.` : "Drop atualizado.", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (drop: AdminDropRow) => {
    if (
      !window.confirm(
        `Excluir o Drop “${drop.title}”${drop.claimCount > 0 ? ` e os ${drop.claimCount} resgate(s)` : ""}? Os permanentes já gravados nas bibliotecas permanecem (§25).`,
      )
    ) {
      return;
    }
    setBusyId(drop.id);
    const result = await drops.remove(drop.id);
    setBusyId(null);
    if (result.ok) notify("Drop excluído.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar os Drops." />;
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
  const items = drops.items ?? [];
  const claims = drops.claims ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Drops do Cliffhanger+</p>
          <p className="text-xs text-[var(--text-muted)]">
            Conteúdo mensal com plano mínimo, janela e resgates registrados (§25)
            {drops.items ? ` · ${items.length} drop(s) · ${claims.length} resgate(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlusTabs active="drops" />
          {canEdit && !editing && (
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing({ mode: "novo" });
                setForm(blankDropForm());
              }}
            >
              Novo Drop
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Drops
          </p>
          <p className="mt-1 text-2xl font-bold">{drops.items ? items.length : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {items.filter((drop) => drop.active).length} ativo(s)
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Resgates
          </p>
          <p className="mt-1 text-2xl font-bold text-gold">{drops.claims ? claims.length : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {claims.filter((claim) => claim.permanence === "permanente").length} permanente(s)
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Temporários × Permanentes
          </p>
          <p className="mt-1 text-2xl font-bold">
            {items.filter((drop) => drop.permanence === "temporario").length} /{" "}
            {items.filter((drop) => drop.permanence === "permanente").length}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            temporário some no cancelamento (§25)
          </p>
        </div>
      </div>

      {editing && (
        <Card
          title={editing.mode === "novo" ? "Novo Drop" : `Editar — ${editing.drop.title}`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput
                value={form.title}
                placeholder="Ex.: Sertão 2099 — E-book"
                onChange={(value) => set("title", value)}
              />
            </Field>
            <Field label="Tipo de conteúdo">
              <SelectInput
                value={form.kind}
                options={[
                  { value: "ebook", label: KIND_LABEL.ebook },
                  { value: "audiobook", label: KIND_LABEL.audiobook },
                  { value: "obra", label: KIND_LABEL.obra },
                ]}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: value as DropForm["kind"],
                    productId: "",
                    workId: "",
                  }))
                }
              />
            </Field>
            <Field
              label={form.kind === "obra" ? "Obra" : "Conteúdo liberado"}
              hint={
                contentOptions.length === 0
                  ? "Nenhum alvo disponível no catálogo."
                  : "O resgate entra na biblioteca do assinante (§25)."
              }
            >
              <SelectInput
                value={form.kind === "obra" ? form.workId : form.productId}
                options={[{ value: "", label: "— selecione —" }, ...contentOptions]}
                onChange={(value) => set(form.kind === "obra" ? "workId" : "productId", value)}
              />
            </Field>
            <Field label="Plano mínimo" hint="Quem resgata precisa ter este plano ou superior.">
              <SelectInput
                value={form.minPlan}
                options={[
                  { value: "essential", label: PLAN_LABEL.essential },
                  { value: "gold", label: PLAN_LABEL.gold },
                  { value: "premium", label: PLAN_LABEL.premium },
                ]}
                onChange={(value) => set("minPlan", value as DropForm["minPlan"])}
              />
            </Field>
            <Field label="Período (AAAA-MM)" hint="Base do progresso semanal da conta (§15).">
              <MonthInput value={form.period} onChange={(value) => set("period", value)} />
            </Field>
            <Field label="Semana">
              <SelectInput
                value={String(form.week)}
                options={[1, 2, 3, 4].map((week) => ({
                  value: String(week),
                  label: `Semana ${week}`,
                }))}
                onChange={(value) => set("week", Number(value))}
              />
            </Field>
            <Field label="Permanência" hint="Temporário dura com a assinatura; permanente fica.">
              <SelectInput
                value={form.permanence}
                options={[
                  { value: "temporario", label: "Temporário" },
                  { value: "permanente", label: "Permanente" },
                ]}
                onChange={(value) => set("permanence", value as DropForm["permanence"])}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Disponível de">
                <DateTimeInput value={form.startsAt} onChange={(value) => set("startsAt", value)} />
              </Field>
              <Field label="Até">
                <DateTimeInput value={form.endsAt} onChange={(value) => set("endsAt", value)} />
              </Field>
            </div>
            <Field label="Descrição">
              <TextArea
                value={form.description}
                rows={3}
                placeholder="Texto exibido na conta do assinante."
                onChange={(value) => set("description", value)}
              />
            </Field>
            <div className="space-y-3">
              <ImageField
                label="Imagem do Drop"
                value={form.image}
                onChange={(url) => set("image", url)}
              />
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => set("active", event.target.checked)}
                />
                Drop ativo (visível para resgate)
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={drops.busy}
              onClick={() => void handleSave()}
            >
              {drops.busy ? "Gravando…" : "Salvar Drop"}
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

      {drops.loading && <p className="text-sm text-[var(--text-muted)]">Carregando Drops…</p>}
      {drops.error && <p className="text-sm text-[#e5484d]">{drops.error}</p>}

      {!drops.loading && !drops.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum Drop configurado — crie o primeiro com “Novo Drop”.
        </p>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {items.map((drop) => {
            const dropClaims = claims.filter((claim) => claim.dropId === drop.id);
            const open = openClaims === drop.id;
            return (
              <div key={drop.id} className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gold">{drop.title}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {KIND_LABEL[drop.kind]} · {PLAN_LABEL[drop.minPlan]}+ ·{" "}
                      {drop.permanence === "permanente" ? "permanente" : "temporário"} · período{" "}
                      {drop.period} · Semana {drop.week} · {when(drop.startsAt)} →{" "}
                      {when(drop.endsAt)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          drop.active
                            ? "border-gold/50 bg-gold/10 text-gold"
                            : "border-[var(--border)] text-[var(--text-muted)]"
                        }`}
                      >
                        {drop.active ? "ativo" : "inativo"}
                      </span>
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {drop.claimCount} resgate(s)
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        onClick={() => setOpenClaims(open ? null : drop.id)}
                      >
                        {open ? "Ocultar resgates" : `Resgates (${dropClaims.length})`}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        onClick={() => {
                          setEditing({ mode: "editar", drop });
                          setForm(toDropForm(drop));
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                        disabled={drops.busy || busyId === drop.id}
                        onClick={() => void handleRemove(drop)}
                      >
                        {busyId === drop.id ? "Excluindo…" : "Excluir"}
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] p-3">
                    {dropClaims.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Nenhum resgate neste Drop ainda.
                      </p>
                    ) : (
                      dropClaims.map((claim) => (
                        <div
                          key={claim.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-mono">{claim.email ?? claim.uid}</span>
                          <span className="text-[var(--text-muted)]">
                            {claim.permanence === "permanente" ? "permanente" : "temporário"} ·
                            semana {claim.week} · {formatDate(claim.claimedAt)}
                          </span>
                        </div>
                      ))
                    )}
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
