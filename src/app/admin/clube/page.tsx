"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminClub } from "@/components/admin/useAdminMarketing";
import {
  Card,
  Field,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import {
  BLANK_BENEFIT_FORM,
  clubTier,
  sanitizeBenefitInput,
  toBenefitForm,
  type BenefitForm,
} from "@/lib/marketing-fields";
import type { ClubBenefit, ClubMember, ClubTier } from "@/lib/types";

/**
 * §12/§18 — Cliffhanger Club: membros com pontos e nível derivado
 * (Farol/Maré/Lenda), ajuste de pontos com motivo obrigatório e catálogo
 * de benefícios trocáveis (cupons, frete, produtos e conteúdo digital).
 */

const TIER_TONE: Record<ClubTier, string> = {
  Farol: "border-[var(--border)] text-[var(--text-muted)]",
  Maré: "border-violet-soft/50 text-violet-soft",
  Lenda: "border-gold/50 bg-gold/10 text-gold",
};

const KIND_LABEL: Record<ClubBenefit["kind"], string> = {
  cupom: "cupom",
  frete: "frete",
  produto: "produto",
  conteudo: "conteúdo digital",
};

function when(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
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

export default function AdminClubPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const club = useAdminClub();

  const [query, setQuery] = useState("");
  const [adjustUid, setAdjustUid] = useState("");
  const [adjustName, setAdjustName] = useState("");
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<ClubBenefit | "novo" | null>(null);
  const [form, setForm] = useState<BenefitForm>(BLANK_BENEFIT_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof BenefitForm>(key: K, value: BenefitForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdjust = async () => {
    const uid = adjustUid.trim();
    if (!uid) {
      notify("Informe o uid do membro (id do documento em clientes).", "error");
      return;
    }
    if (!Number.isInteger(delta) || delta === 0) {
      notify("O ajuste precisa ser um número inteiro diferente de zero.", "error");
      return;
    }
    const result = await club.adjust(uid, delta, reason);
    if (result.ok) {
      notify(
        `${delta > 0 ? "Creditados" : "Debitadas"} ${Math.abs(delta)} ponto(s) — saldo: ${result.data.member.points}.`,
        "success",
      );
      setAdjustUid("");
      setAdjustName("");
      setDelta(0);
      setReason("");
    } else {
      notify(result.message, "error");
    }
  };

  const handleSaveBenefit = async () => {
    const existing = editing && editing !== "novo" ? editing : null;
    const parsed = sanitizeBenefitInput(form, existing);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await club.saveBenefit(parsed.item, editing === "novo");
    if (result.ok) {
      notify(
        editing === "novo" ? `Benefício “${parsed.item.title}” criado.` : `Benefício “${parsed.item.title}” atualizado.`,
        "success",
      );
      setEditing(null);
      setForm(BLANK_BENEFIT_FORM);
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemoveBenefit = async (benefit: ClubBenefit) => {
    if (!window.confirm(`Excluir o benefício “${benefit.title}”? Membros com pontos continuam existindo.`)) {
      return;
    }
    setBusyId(benefit.id);
    const result = await club.removeBenefit(benefit.id);
    setBusyId(null);
    if (result.ok) notify("Benefício excluído.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar o clube." />;
  }

  const allowed = roleLoading || can("club.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">club.view</code> — o clube fica com os papéis Comercial,
          Marketing e Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("club.edit");
  const members = club.members ?? [];
  const benefits = club.benefits ?? [];

  const needle = query.trim().toLowerCase();
  const visible = members.filter((member) =>
    !needle
      ? true
      : member.uid.toLowerCase().includes(needle) ||
        (member.email ?? "").toLowerCase().includes(needle) ||
        (member.name ?? "").toLowerCase().includes(needle),
  );

  const totals = {
    members: members.length,
    points: members.reduce((sum, member) => sum + member.points, 0),
    benefits: benefits.filter((benefit) => benefit.active).length,
    cheapest: benefits.filter((benefit) => benefit.active).reduce((min, benefit) => Math.min(min, benefit.cost), 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Cliffhanger Club</p>
          <p className="text-xs text-[var(--text-muted)]">
            Pontos por compras e atividades, níveis e troca por benefícios (§18)
            {club.members ? ` · ${totals.members} membro(s)` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setEditing("novo");
              setForm(BLANK_BENEFIT_FORM);
            }}
          >
            Novo benefício
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Membros
          </p>
          <p className="text-lg font-bold">{totals.members}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Pontos distribuídos
          </p>
          <p className="text-lg font-bold text-gold">{totals.points}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Benefícios ativos
          </p>
          <p className="text-lg font-bold">{totals.benefits}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Resgate a partir de
          </p>
          <p className="text-lg font-bold">{totals.benefits > 0 ? `${totals.cheapest} pts` : "—"}</p>
        </div>
      </div>

      {canEdit && (
        <Card title="Ajustar pontos">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Uid do membro" hint="Id do documento em clientes.">
              <TextInput value={adjustUid} placeholder="uid da conta" onChange={setAdjustUid} />
            </Field>
            <Field label="Ajuste (+ crédita · − debita)">
              <NumberInput value={delta} step={1} onChange={setDelta} />
            </Field>
            <Field label="Motivo (obrigatório)" hint="Vai para a auditoria.">
              <TextInput
                value={reason}
                placeholder="Ex.: compra CH-1234 · 1 pto/R$"
                onChange={setReason}
              />
            </Field>
            <div className="flex items-end gap-3 pb-1">
              <button
                type="button"
                className="btn btn-primary px-4 py-2 text-[11px]"
                disabled={club.busy}
                onClick={() => void handleAdjust()}
              >
                {club.busy ? "Ajustando…" : "Aplicar ajuste"}
              </button>
              {adjustName && <p className="text-xs text-[var(--text-muted)]">{adjustName}</p>}
            </div>
          </div>
        </Card>
      )}

      {editing && (
        <Card title={editing === "novo" ? "Novo benefício" : `Editar — ${form.title || "sem título"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput value={form.title} placeholder="Ex.: Frete grátis" onChange={(v) => set("title", v)} />
            </Field>
            <Field label="Descrição">
              <TextArea value={form.description} rows={2} placeholder="Como o membro usa." onChange={(v) => set("description", v)} />
            </Field>
            <Field label="Custo (pontos)">
              <NumberInput value={form.cost} min={1} step={1} onChange={(v) => set("cost", v)} />
            </Field>
            <Field label="Tipo">
              <SelectInput
                value={form.kind}
                options={[
                  { value: "cupom", label: "Cupom" },
                  { value: "frete", label: "Frete" },
                  { value: "produto", label: "Produto exclusivo" },
                  { value: "conteudo", label: "Conteúdo digital" },
                ]}
                onChange={(v) => set("kind", v as ClubBenefit["kind"])}
              />
            </Field>
            {form.kind === "cupom" && (
              <Field label="Código do cupom" hint="Entregue no resgate — precisa existir em Cupons.">
                <TextInput value={form.couponCode} placeholder="CLUBE10" onChange={(v) => set("couponCode", v)} />
              </Field>
            )}
            <div className="flex items-end pb-1 text-xs text-[var(--text-muted)]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => set("active", event.target.checked)}
                />
                Benefício ativo para resgate
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={club.busy}
              onClick={() => void handleSaveBenefit()}
            >
              {club.busy ? "Gravando…" : "Salvar benefício"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing(null);
                setForm(BLANK_BENEFIT_FORM);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {club.loading && <p className="text-sm text-[var(--text-muted)]">Carregando clube…</p>}
      {club.error && <p className="text-sm text-[#e5484d]">{club.error}</p>}

      {!club.loading && !club.error && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Membros ({visible.length})
            </p>
            <div className="w-72">
              <TextInput value={query} placeholder="Buscar por nome, e-mail ou uid" onChange={setQuery} />
            </div>
          </div>

          {members.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum membro ainda — o primeiro nasce no ajuste de pontos acima.
            </p>
          )}

          {visible.length > 0 && (
            <div className="card divide-y divide-[var(--border)]/60 p-0">
              {visible.map((member: ClubMember) => {
                const tier = clubTier(member.points);
                return (
                  <div key={member.uid} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gold">
                        {member.name || member.email || member.uid}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        <span className="font-mono">{member.uid}</span>
                        {member.email && member.name ? ` · ${member.email}` : ""} · atualizado em{" "}
                        {when(member.updatedAt)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Label>{member.points} ponto(s)</Label>
                        <Label tone={TIER_TONE[tier]}>nível {tier}</Label>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        onClick={() => {
                          setAdjustUid(member.uid);
                          setAdjustName(member.name || member.email || "");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Ajustar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Benefícios ({benefits.length})
          </p>

          {benefits.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum benefício cadastrado — crie o primeiro com o botão “Novo benefício”.
            </p>
          )}

          {benefits.length > 0 && (
            <div className="card divide-y divide-[var(--border)]/60 p-0">
              {benefits.map((benefit) => (
                <div key={benefit.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gold">{benefit.title}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {benefit.cost} pontos · {KIND_LABEL[benefit.kind]}
                      {benefit.couponCode ? ` · cupom ${benefit.couponCode}` : ""}
                      {benefit.description ? ` · ${benefit.description}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {benefit.active ? (
                        <Label tone="border-gold/50 bg-gold/10 text-gold">ativo</Label>
                      ) : (
                        <Label tone="border-[#e5484d]/50 text-[#e5484d]">inativo</Label>
                      )}
                      <Label>{KIND_LABEL[benefit.kind]}</Label>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        onClick={() => {
                          setEditing(benefit);
                          setForm(toBenefitForm(benefit));
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        disabled={busyId === benefit.id}
                        onClick={() => void handleRemoveBenefit(benefit)}
                      >
                        {busyId === benefit.id ? "Excluindo…" : "Excluir"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
