"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheck, IconStar, IconX } from "@/components/Icons";
import { useStore } from "@/components/Providers";
import { uploadImage } from "@/components/admin/upload";
import { formatDate } from "@/lib/format";
import { getClientAuth } from "@/lib/firebase";
import type { PublicReview } from "@/lib/types";

type Phase = "loading" | "ready" | "error";

/**
 * §19/§24 — lista pública de avaliações aprovadas (GET /api/reviews) com
 * estados de carregando/erro/vazio + envio opcional pelo cliente logado
 * (POST /api/reviews; entra como pendente na moderação do painel).
 */
export function ProductReviews({ productId }: { productId: string }) {
  const { user, notify } = useStore();
  const [phase, setPhase] = useState<Phase>("loading");
  const [items, setItems] = useState<PublicReview[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `/api/reviews?productId=${encodeURIComponent(productId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items?: PublicReview[] };
        setItems(Array.isArray(data.items) ? data.items : []);
        setPhase("ready");
      } catch {
        setPhase("error");
      }
    })();
  }, [productId, retryTick]);

  const onPickPhotos = async (files: FileList | null) => {
    if (!files || photos.length >= 3) return;
    setUploading(true);
    const room = 3 - photos.length;
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const result = await uploadImage(file);
      if (result.ok) added.push(result.url);
      else notify(result.message, "error");
    }
    setUploading(false);
    if (added.length) setPhotos((prev) => [...prev, ...added].slice(0, 3));
  };

  const onSubmit = async () => {
    setFormError(null);
    const trimmed = comment.trim();
    if (rating < 1 || rating > 5) {
      setFormError("A nota vai de 1 a 5 estrelas.");
      return;
    }
    if (!name.trim()) {
      setFormError("Informe seu nome na avaliação.");
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 2000) {
      setFormError("O comentário precisa de 3 a 2000 caracteres.");
      return;
    }

    setSending(true);
    try {
      const token = await getClientAuth()?.currentUser?.getIdToken();
      if (!token) {
        setFormError("Entre na sua conta para avaliar.");
        return;
      }
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          review: {
            productId,
            authorName: name.trim(),
            rating,
            comment: trimmed,
            photos,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setFormError(data?.error ?? "Não foi possível enviar a avaliação.");
        return;
      }
      setSent(true);
      setFormOpen(false);
      setComment("");
      setPhotos([]);
      notify("Avaliação enviada — ela entra na lista após a moderação.", "success");
    } catch {
      setFormError("Falha de rede ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* estados: carregando / erro (§24) */}
      {phase === "loading" && (
        <p className="card p-5 text-sm text-[var(--text-muted)]">
          Carregando avaliações…
        </p>
      )}
      {phase === "error" && (
        <div className="card p-5 text-sm">
          <p className="text-[#e5484d]">Não foi possível carregar as avaliações.</p>
          <button
            type="button"
            className="btn btn-ghost mt-3 px-4 py-2 text-xs"
            onClick={() => {
              setPhase("loading");
              setRetryTick((tick) => tick + 1);
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {/* estado vazio (§24) */}
      {phase === "ready" && items.length === 0 && (
        <p className="card p-5 text-sm text-[var(--text-muted)]">
          Ainda não há avaliações publicadas para este produto. Seja o primeiro a
          contar como foi.
        </p>
      )}

      {/* lista */}
      {phase === "ready" && items.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((review) => (
            <article key={review.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="flex gap-0.5 text-gold"
                  aria-label={`Nota ${review.rating} de 5`}
                >
                  {[1, 2, 3, 4, 5].map((step) => (
                    <IconStar
                      key={step}
                      filled={step <= review.rating}
                      className={`h-4 w-4 ${step <= review.rating ? "opacity-100" : "opacity-35"}`}
                    />
                  ))}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(review.createdAt)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                “{review.comment}”
              </p>

              {review.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.photos.map((photo) => (
                    <span
                      key={photo}
                      className="h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- foto enviada pelo cliente (URL livre) */}
                      <img
                        src={photo}
                        alt="Foto da avaliação"
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-gold">
                  {review.authorName}
                </span>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#30a46c]/40 bg-[#30a46c]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#30a46c]">
                    <IconCheck className="h-3 w-3" />
                    Compra verificada
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* envio (§19) */}
      <div className="card p-5">
        {sent ? (
          <p className="text-sm text-[var(--text-muted)]">
            Sua avaliação foi enviada e está aguardando moderação. Obrigado por
            participar da Cliffhanger Store.
          </p>
        ) : !user ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              Comprou este produto? Avalie com estrelas, comentário e fotos.
            </p>
            <Link href="/login" className="btn btn-primary px-4 py-2 text-xs">
              Entre para avaliar
            </Link>
          </div>
        ) : !formOpen ? (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-xs"
            onClick={() => {
              setFormOpen(true);
              // préfill da sessão no momento da abertura (sem efeito)
              if (!name && user) {
                setName(user.displayName || user.email?.split("@")[0] || "");
              }
            }}
          >
            Avaliar este produto
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Sua avaliação
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Nota
              </span>
              <span className="flex gap-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <button
                    key={step}
                    type="button"
                    aria-label={`Nota ${step} de 5`}
                    onClick={() => setRating(step)}
                    className="transition hover:scale-110"
                  >
                    <IconStar
                      filled={step <= rating}
                      className={`h-6 w-6 ${step <= rating ? "text-gold" : "text-[var(--text-muted)] opacity-40"}`}
                    />
                  </button>
                ))}
              </span>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Seu nome
              </span>
              <input
                className="field"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="Como você quer ser chamado"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Comentário
              </span>
              <textarea
                className="field min-h-28"
                value={comment}
                maxLength={2000}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Conte como foi a leitura, a qualidade do produto, a entrega…"
              />
              <span className="text-right text-[11px] text-[var(--text-muted)]">
                {comment.length}/2000
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Fotos (até 3)
              </span>
              {photos.map((photo) => (
                <span
                  key={photo}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura da foto escolhida */}
                  <img src={photo} alt="Foto escolhida" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() => setPhotos((prev) => prev.filter((p) => p !== photo))}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/85 text-white"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {photos.length < 3 && (
                <label className="btn btn-ghost cursor-pointer px-3 py-1.5 text-[11px]">
                  {uploading ? "Enviando…" : "Adicionar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      void onPickPhotos(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {formError && <p className="text-xs text-[#e5484d]">{formError}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary px-4 py-2 text-xs"
                disabled={sending || uploading}
                onClick={() => void onSubmit()}
              >
                {sending ? "Enviando…" : "Enviar avaliação"}
              </button>
              <button
                type="button"
                className="btn btn-ghost px-4 py-2 text-xs"
                disabled={sending}
                onClick={() => {
                  setFormOpen(false);
                  setFormError(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
