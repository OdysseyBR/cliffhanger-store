"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { Card, Field, NumberInput, TextInput } from "@/components/admin/form-fields";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { useAdminPlusBoard } from "@/components/admin/useAdminPlus";
import { formatPrice } from "@/lib/format";
import {
  DEFAULT_PLUS_PLANS,
  sanitizePlusPlansInput,
  type PlusPlan,
  type PlusPlanId,
} from "@/lib/plus-fields";

/**
 * §24 — planos do Cliffhanger+ no painel: Essential/Gold/Premium
 * configuráveis (preço, conceito e benefícios) gravados em `site/plus`,
 * com indicadores de assinatura (§17). Latoy® Focus Multiverse segue
 * como funcionalidade futura (§24).
 */

interface PlanDraft {
  id: PlusPlanId;
  name: string;
  price: number;
  concept: string;
  perksText: string;
}

function toDrafts(plans: PlusPlan[]): PlanDraft[] {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    concept: plan.concept,
    perksText: plan.perks.join("\n"),
  }));
}

export default function AdminPlusPlansPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const plus = useAdminPlusBoard();

  const [drafts, setDrafts] = useState<PlanDraft[] | null>(null);

  /** Rascunho local: enquanto o painel não altera nada, vale o que veio do servidor. */
  const current = drafts ?? toDrafts(plus.board?.plans ?? DEFAULT_PLUS_PLANS);

  const set = <K extends keyof PlanDraft>(index: number, key: K, value: PlanDraft[K]) =>
    setDrafts((prev) =>
      (prev ?? toDrafts(plus.board?.plans ?? DEFAULT_PLUS_PLANS)).map((draft, i) =>
        i === index ? { ...draft, [key]: value } : draft,
      ),
    );

  const handleSave = async () => {
    const plans = current.map((draft) => ({
      id: draft.id,
      name: draft.name,
      price: draft.price,
      concept: draft.concept,
      perks: draft.perksText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }));
    const parsed = sanitizePlusPlansInput({ plans });
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await plus.save(parsed.item);
    if (result.ok) {
      notify(
        result.data.changed
          ? "Planos do Cliffhanger+ atualizados."
          : "Nada mudou — os planos já estavam assim.",
        "success",
      );
      setDrafts(null);
      plus.reload();
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar o Cliffhanger+." />;
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
  const stats = plus.board?.stats;
  const updatedAt = plus.board?.updatedAt;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Cliffhanger+</p>
          <p className="text-xs text-[var(--text-muted)]">
            Planos do programa e indicadores de assinatura (§24/§17)
            {updatedAt ? ` · atualizado em ${updatedAt.slice(0, 10).replace(/-/g, "/")}` : ""}
          </p>
        </div>
        <PlusTabs active="planos" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Assinantes ativos
          </p>
          <p className="mt-1 text-2xl font-bold text-gold">{stats ? stats.ativos : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {stats ? `${stats.total} assinatura(s) no total` : "carregando…"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Por plano
          </p>
          <p className="mt-1 text-2xl font-bold">
            {stats
              ? `${stats.porPlano.essential} / ${stats.porPlano.gold} / ${stats.porPlano.premium}`
              : "—"}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">Essential / Gold / Premium</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Receita mensal simulada
          </p>
          <p className="mt-1 text-2xl font-bold">{stats ? formatPrice(stats.mrr) : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">soma dos planos ativos (§17)</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Canceladas
          </p>
          <p className="mt-1 text-2xl font-bold">{stats ? stats.cancelados : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            permanentes resgatados continuam na biblioteca (§25)
          </p>
        </div>
      </div>

      {plus.loading && <p className="text-sm text-[var(--text-muted)]">Carregando planos…</p>}
      {plus.error && <p className="text-sm text-[#e5484d]">{plus.error}</p>}

      {plus.board && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {current.map((draft, index) => (
              <Card key={draft.id} title={`${draft.name} — ${formatPrice(draft.price)}/mês`}>
                <div className="grid gap-4">
                  <Field label="Preço mensal (R$)" hint="Mínimo 0,00 — cobrança simulada.">
                    <NumberInput
                      value={draft.price}
                      min={0}
                      max={1000}
                      step={0.01}
                      disabled={!canEdit}
                      onChange={(value) => set(index, "price", value)}
                    />
                  </Field>
                  <Field label="Conceito" hint="Frase de campanha (§24).">
                    <TextInput
                      value={draft.concept}
                      disabled={!canEdit}
                      placeholder="Ex.: Economize."
                      onChange={(value) => set(index, "concept", value)}
                    />
                  </Field>
                  <Field label="Benefícios (um por linha)">
                    <textarea
                      value={draft.perksText}
                      rows={7}
                      disabled={!canEdit}
                      onChange={(event) => set(index, "perksText", event.target.value)}
                      className="field w-full"
                    />
                  </Field>
                </div>
              </Card>
            ))}
          </div>

          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-xs text-[var(--text-muted)]">
              Latoy® Focus Multiverse permanece como funcionalidade futura (§24). Alterações valem
              para a vitrine da conta e para novas assinaturas.
            </p>
            {canEdit ? (
              <button
                type="button"
                className="btn btn-primary px-4 py-2 text-[11px]"
                disabled={plus.busy}
                onClick={() => void handleSave()}
              >
                {plus.busy ? "Gravando…" : "Salvar planos"}
              </button>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                somente leitura
              </span>
            )}
          </div>
        </>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">
        Padrão oficial: Essential {formatPrice(DEFAULT_PLUS_PLANS[0].price)} · Gold{" "}
        {formatPrice(DEFAULT_PLUS_PLANS[1].price)} · Premium {formatPrice(DEFAULT_PLUS_PLANS[2].price)}
      </p>
    </div>
  );
}
