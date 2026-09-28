"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { formatDate, formatPrice } from "@/lib/format";
import { currentWeek } from "@/lib/plus-fields";
import type {
  ClubBox,
  PlusDropView,
  PlusPlan,
  PlusPlanId,
  PlusState,
} from "@/lib/plus-fields";

/**
 * §15 — central pessoal da assinatura Cliffhanger+: situação (plano, preço,
 * próxima cobrança), progresso dos benefícios semanais (Drops), catálogo de
 * planos, resgate dos Drops e caixas do Clube do Leitor (§26). O
 * gerenciamento (assinar/trocar/cancelar) roda em billing simulado (§17 —
 * nenhuma cobrança real acontece) e o admin gerencia drops/planos no painel
 * (§24–§26).
 */

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthLabel(period: string): string {
  const [year, month] = period.split("-");
  const index = Number(month) - 1;
  if (!year || Number.isNaN(index) || !MONTHS[index]) return period;
  return `${MONTHS[index]} de ${year}`;
}

function boxStatusLabel(status: ClubBox["status"]): string {
  if (status === "enviada") return "Enviada";
  if (status === "em_preparo") return "Em preparo";
  return "Planejada";
}

const BLOCK_LABEL: Record<NonNullable<PlusDropView["blocked"]>, string> = {
  assinatura: "Assine para resgatar",
  plano: "Exige plano superior",
  janela: "Fora da janela",
  inativo: "Indisponível",
  resgatado: "Resgatado",
};

export default function ContaPlusPage() {
  const { user, notify } = useStore();
  const [state, setState] = useState<PlusState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getClientAuth()?.currentUser?.getIdToken();
      const res = await fetch("/api/account/plus", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setState((await res.json()) as PlusState);
      } else if (res.status === 401) {
        setState(null);
      } else {
        notify("Não foi possível carregar sua assinatura.", "error");
      }
    } catch {
      /* offline — mantém o estado anterior */
    } finally {
      setLoading(false);
    }
  }, [user, notify]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const runAction = async (action: "assinar" | "trocar" | "cancelar", plan?: PlusPlanId) => {
    if (busy) return;
    setBusy(action);
    try {
      const token = await getClientAuth()?.currentUser?.getIdToken();
      const res = await fetch("/api/account/plus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(plan ? { action, plan } : { action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        notify(data.error ?? "Falha no gerenciamento da assinatura.", "error");
        return;
      }
      notify(
        action === "assinar"
          ? "Assinatura Cliffhanger+ ativada."
          : action === "trocar"
            ? "Plano alterado com sucesso."
            : "Assinatura cancelada. Itens permanentes seguem na biblioteca.",
        "success",
      );
      setConfirmingCancel(false);
      await load();
    } catch {
      notify("Falha no gerenciamento da assinatura.", "error");
    } finally {
      setBusy(null);
    }
  };

  const claimDrop = async (drop: PlusDropView) => {
    if (busy) return;
    setBusy(`drop-${drop.id}`);
    try {
      const token = await getClientAuth()?.currentUser?.getIdToken();
      const res = await fetch(`/api/account/plus/drops/${encodeURIComponent(drop.id)}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as {
        error?: string;
        permanence?: "temporario" | "permanente";
        alreadyHad?: boolean;
      };
      if (!res.ok) {
        notify(data.error ?? "Não foi possível resgatar este Drop.", "error");
        return;
      }
      notify(
        data.alreadyHad
          ? "Você já resgatou este Drop."
          : data.permanence === "permanente"
            ? "Drop resgatado! O item já está na sua biblioteca."
            : "Drop resgatado! Acesso liberado enquanto você assinar.",
        "success",
      );
      await load();
    } catch {
      notify("Não foi possível resgatar este Drop.", "error");
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  const sub = state?.subscription ?? null;
  const active = Boolean(sub && sub.status === "ativo");
  const planName = sub
    ? state?.plans.find((p) => p.id === sub.plan)?.name ?? sub.plan
    : "";
  const week = currentWeek();

  const planCta = (plan: PlusPlan): { label: string; disabled: boolean } => {
    if (active && sub?.plan === plan.id) return { label: "Plano atual", disabled: true };
    if (active) return { label: `Trocar para ${plan.name}`, disabled: false };
    return { label: `Assinar ${plan.name}`, disabled: false };
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-display text-2xl text-gold">Cliffhanger+</p>
        <p className="text-xs text-[var(--text-muted)]">
          Sua assinatura, os Drops do período e o Clube do Leitor em um só lugar.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando sua assinatura…</p>
      )}

      {!loading && !state && (
        <div className="card p-5 text-sm text-[var(--text-muted)]">
          Não foi possível carregar a assinatura agora. Atualize a página para tentar
          novamente.
        </div>
      )}

      {!loading && state && (
        <>
          {/* §15 — situação da assinatura */}
          <section className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-display text-xl text-gold">
                Cliffhanger+ {sub ? planName : ""}
              </p>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  active
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {active ? "Ativo" : sub ? "Cancelado" : "Não assinado"}
              </span>
            </div>

            {sub ? (
              <div className="space-y-1 text-sm">
                <p className="font-bold">{formatPrice(sub.price)}/mês</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {active
                    ? `Próxima cobrança: ${formatDate(sub.nextBillingAt)}`
                    : `Assinatura cancelada em ${formatDate(sub.canceledAt ?? sub.updatedAt)} — benefícios temporários encerrados.`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Você ainda não tem uma assinatura. Escolha um plano abaixo para começar.
              </p>
            )}

            {sub && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Benefícios do plano
                </p>
                <ul className="grid gap-1 text-xs text-[var(--text-muted)] sm:grid-cols-2">
                  {(state.plans.find((p) => p.id === sub.plan)?.perks ?? []).map((perk) => (
                    <li key={perk}>· {perk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* §15 — progresso dos benefícios com periodicidade */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Drops · {monthLabel(state.period)}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {state.progress.map((item) => (
                  <div
                    key={item.week}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      item.claimed
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : item.week === week && active
                          ? "border-[var(--border)] text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {item.claimed ? "✓" : "○"} Semana {item.week}
                    {item.week === week && !item.claimed && active ? " · atual" : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* gerenciamento (§15) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {active && (
                <button
                  type="button"
                  className="btn px-3 py-2 text-xs"
                  disabled={busy !== null}
                  onClick={() =>
                    document
                      .getElementById("planos-plus")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  Trocar de plano
                </button>
              )}
              {active && !confirmingCancel && (
                <button
                  type="button"
                  className="btn px-3 py-2 text-xs text-[var(--text-muted)]"
                  disabled={busy !== null}
                  onClick={() => setConfirmingCancel(true)}
                >
                  Cancelar assinatura
                </button>
              )}
              {active && confirmingCancel && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary px-3 py-2 text-xs"
                    disabled={busy !== null}
                    onClick={() => void runAction("cancelar")}
                  >
                    {busy === "cancelar" ? "Cancelando…" : "Confirmar cancelamento"}
                  </button>
                  <button
                    type="button"
                    className="btn px-3 py-2 text-xs"
                    disabled={busy !== null}
                    onClick={() => setConfirmingCancel(false)}
                  >
                    Manter assinatura
                  </button>
                </>
              )}
              {!active && (
                <p className="text-xs text-[var(--text-muted)]">
                  Contratação e troca acontecem nos planos abaixo.
                </p>
              )}
            </div>
          </section>

          {/* §15 — planos */}
          <section id="planos-plus" className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Planos
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {state.plans.map((plan) => {
                const cta = planCta(plan);
                return (
                  <div key={plan.id} className="card space-y-2 p-5">
                    <p className="text-display text-xl text-gold">
                      Cliffhanger+ {plan.name}
                    </p>
                    <p className="text-sm font-bold">{formatPrice(plan.price)}/mês</p>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      {plan.concept}
                    </p>
                    <ul className="space-y-1 text-xs text-[var(--text-muted)]">
                      {plan.perks.map((perk) => (
                        <li key={perk}>· {perk}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={`btn w-full px-3 py-2 text-xs ${
                        !cta.disabled && active ? "btn-primary" : ""
                      }`}
                      disabled={cta.disabled || busy !== null}
                      onClick={() =>
                        void runAction(active ? "trocar" : "assinar", plan.id)
                      }
                    >
                      {cta.disabled
                        ? cta.label
                        : busy === (active ? "trocar" : "assinar")
                          ? "Aguarde…"
                          : cta.label}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Latoy® Focus Multiverse estará disponível em breve para o Premium.
            </p>
          </section>

          {/* §15/§25 — Drops configuráveis pelo painel */}
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Drops disponíveis
            </p>
            {state.drops.length === 0 ? (
              <div className="card p-5 text-sm text-[var(--text-muted)]">
                Nenhum Drop publicado agora — novos Drops saem toda semana.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {state.drops.map((drop) => (
                  <div key={drop.id} className="card space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">
                        {drop.title}
                      </p>
                      <span className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        {drop.permanence === "permanente" ? "Permanente" : "Temporário"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{drop.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      <span>Semana {drop.week}</span>
                      <span>·</span>
                      <span>Requer {drop.minPlan}</span>
                      {drop.startsAt && drop.endsAt && (
                        <>
                          <span>·</span>
                          <span className="normal-case tracking-normal">
                            {formatDate(drop.startsAt)} – {formatDate(drop.endsAt)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {drop.blocked === "resgatado" ? "✓ Na sua biblioteca" : ""}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary px-3 py-2 text-xs"
                        disabled={!drop.claimable || busy !== null}
                        onClick={() => void claimDrop(drop)}
                      >
                        {busy === `drop-${drop.id}`
                          ? "Resgatando…"
                          : drop.claimable
                            ? "Resgatar"
                            : BLOCK_LABEL[drop.blocked ?? "inativo"]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              Drops temporários ficam disponíveis enquanto a assinatura estiver ativa;
              os permanentes entram na biblioteca para sempre.{" "}
              <Link href="/conta/biblioteca" className="text-gold underline">
                Abrir minha biblioteca
              </Link>
              .
            </p>
          </section>

          {/* §26 — Clube do Leitor */}
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Clube do Leitor
            </p>
            {state.club.boxes.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {state.club.boxes.map((box) => (
                  <div key={box.id} className="card space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold">{box.title}</p>
                      <span className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        {boxStatusLabel(box.status)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{box.description}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      {monthLabel(box.month)} ·{" "}
                      {box.productIds.length > 0
                        ? `${box.productIds.length} item(ns) na caixa`
                        : "conteúdo em curadoria"}
                    </p>
                  </div>
                ))}
              </div>
            ) : state.club.eligible ? (
              <div className="card p-5 text-sm text-[var(--text-muted)]">
                Nenhuma caixa disponível agora — a próxima edição já está sendo
                preparada.
              </div>
            ) : (
              <div className="card space-y-2 p-5">
                <p className="text-sm">
                  O Clube do Leitor é exclusivo para os planos Gold e Premium.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {active
                    ? "Troque seu plano para participar das caixas mensais."
                    : "Assine um dos planos para participar das caixas mensais."}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
