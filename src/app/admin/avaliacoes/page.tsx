"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminReviews } from "@/components/admin/useAdminMarketing";
import { SelectInput } from "@/components/admin/form-fields";
import type { Review } from "@/lib/types";

/**
 * §12/§19 — Avaliações: moderação de estrelas, comentários e fotos com
 * indicação de compra verificada. Aprovar, rejeitar (volta a pendente ou
 * rejeita) ou excluir — atendimento e administrador; editorial e
 * marketing leem (§13).
 */

type StatusFilter = "all" | Review["status"];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "pendente", label: "Pendentes" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "rejeitada", label: "Rejeitadas" },
];

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

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
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

export default function AdminReviewsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const reviews = useAdminReviews();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleModerate = async (review: Review, next: Review["status"]) => {
    setBusyId(review.id);
    const result = await reviews.moderate(review.id, next);
    setBusyId(null);
    if (result.ok) {
      notify(
        result.data.changed
          ? `Avaliação ${next === "aprovada" ? "aprovada" : next === "rejeitada" ? "rejeitada" : "devolvida para pendência"}.`
          : "Nada mudou — o status já era esse.",
        "success",
      );
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (review: Review) => {
    if (
      !window.confirm(
        `Excluir a avaliação de “${review.authorName}” (${review.rating}★)? O histórico da moderação sai junto.`,
      )
    ) {
      return;
    }
    setBusyId(review.id);
    const result = await reviews.remove(review.id);
    setBusyId(null);
    if (result.ok) notify("Avaliação excluída.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para moderar as avaliações." />;
  }

  const allowed = roleLoading || can("reviews.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">reviews.view</code> — avaliações ficam com Atendimento,
          Editorial, Marketing e Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("reviews.edit");
  const items = reviews.items ?? [];
  const list = items.filter((review) => status === "all" || review.status === status);

  const totals = {
    all: items.length,
    pending: items.filter((review) => review.status === "pendente").length,
    approved: items.filter((review) => review.status === "aprovada").length,
    avg:
      items.length > 0
        ? (items.reduce((sum, review) => sum + review.rating, 0) / items.length).toFixed(1).replace(".", ",")
        : "—",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Avaliações</p>
          <p className="text-xs text-[var(--text-muted)]">
            Estrelas, comentários, fotos e compra verificada — moderação (§19)
            {reviews.items ? ` · ${totals.all} avaliação(ões)` : ""}
          </p>
        </div>
        <div className="w-64">
          <SelectInput
            value={status}
            options={STATUS_OPTIONS}
            onChange={(v) => setStatus(v as StatusFilter)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Avaliações
          </p>
          <p className="text-lg font-bold">{totals.all}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Pendentes
          </p>
          <p className={`text-lg font-bold ${totals.pending > 0 ? "text-gold" : ""}`}>
            {totals.pending}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Aprovadas
          </p>
          <p className="text-lg font-bold">{totals.approved}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Nota média
          </p>
          <p className="text-lg font-bold">{totals.avg}</p>
        </div>
      </div>

      {reviews.loading && <p className="text-sm text-[var(--text-muted)]">Carregando avaliações…</p>}
      {reviews.error && <p className="text-sm text-[#e5484d]">{reviews.error}</p>}

      {!reviews.loading && !reviews.error && items.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma avaliação enviada — clientes logados avaliam pela loja e caem aqui como
          pendentes.
        </p>
      )}

      {!reviews.loading && !reviews.error && items.length > 0 && list.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Nenhuma avaliação neste status.</p>
      )}

      {list.length > 0 && (
        <div className="space-y-3">
          {list.map((review) => (
            <div key={review.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gold">
                    <span aria-label={`${review.rating} de 5 estrelas`}>{stars(review.rating)}</span>
                    {" · "}
                    {review.authorName}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {review.productTitle ?? review.productId}
                    {review.email ? ` · ${review.email}` : ""} · {when(review.createdAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {review.status === "pendente" && (
                      <Label tone="border-gold/50 bg-gold/10 text-gold">pendente</Label>
                    )}
                    {review.status === "aprovada" && (
                      <Label tone="border-violet-soft/50 text-violet-soft">aprovada</Label>
                    )}
                    {review.status === "rejeitada" && (
                      <Label tone="border-[#e5484d]/50 text-[#e5484d]">rejeitada</Label>
                    )}
                    {review.verified ? (
                      <Label>compra verificada</Label>
                    ) : (
                      <Label>não verificada</Label>
                    )}
                    {review.photos.length > 0 && <Label>{review.photos.length} foto(s)</Label>}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {review.status !== "aprovada" && (
                      <button
                        type="button"
                        className="btn btn-primary px-3 py-2 text-[11px]"
                        disabled={reviews.busy || busyId === review.id}
                        onClick={() => void handleModerate(review, "aprovada")}
                      >
                        Aprovar
                      </button>
                    )}
                    {review.status !== "rejeitada" && (
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        disabled={reviews.busy || busyId === review.id}
                        onClick={() => void handleModerate(review, "rejeitada")}
                      >
                        Rejeitar
                      </button>
                    )}
                    {review.status !== "pendente" && (
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        disabled={reviews.busy || busyId === review.id}
                        onClick={() => void handleModerate(review, "pendente")}
                      >
                        Devolver
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      disabled={reviews.busy || busyId === review.id}
                      onClick={() => void handleRemove(review)}
                    >
                      {busyId === review.id ? "…" : "Excluir"}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-[var(--text)]">{review.comment}</p>

              {review.photos.length > 0 && (
                <p className="break-all text-[11px] text-[var(--text-muted)]">
                  Fotos:{" "}
                  {review.photos.map((photo, index) => (
                    <a
                      key={`${review.id}-foto-${index}`}
                      href={photo}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-gold"
                    >
                      foto {index + 1}
                    </a>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
