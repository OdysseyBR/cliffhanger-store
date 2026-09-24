"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { duplicateTheme, saveTheme } from "@/components/admin/admin-api";
import { IconCheck, IconX } from "@/components/Icons";
import { useAdminThemes } from "@/components/admin/useAdminThemes";
import {
  THEME_KIND_LABELS,
  THEME_PHASE_LABELS,
  themePhase,
} from "@/lib/theme-css";
import type { ThemeModel, ThemePhase } from "@/lib/types";

const PHASE_STYLES: Record<ThemePhase, string> = {
  rascunho: "border-[var(--border)] text-[var(--text-muted)]",
  preview: "border-sky-400/50 text-sky-300",
  publicado: "border-violet-soft text-violet-soft",
  agendado: "border-gold/60 text-gold",
  ativo: "border-emerald-400/60 text-emerald-300",
  expirado: "border-orange-400/60 text-orange-300",
  arquivado: "border-[var(--border)] text-[var(--text-muted)] opacity-60",
};

function formatWindow(theme: ThemeModel): string {
  const start = theme.scheduledStart ? new Date(theme.scheduledStart).toLocaleDateString("pt-BR") : null;
  const end = theme.scheduledEnd ? new Date(theme.scheduledEnd).toLocaleDateString("pt-BR") : null;
  if (start && end) return `${start} → ${end}`;
  if (start) return `a partir de ${start}`;
  if (end) return `até ${end}`;
  return "sem janela";
}

export default function AdminThemesPage() {
  const { user, logout } = useStore();
  const { themes, email, error, loading, reload } = useAdminThemes();
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fail = (text: string) => setMessage({ ok: false, text });
  const ok = (text: string) => setMessage({ ok: true, text });

  const guard = async (id: string, action: () => Promise<void>) => {
    setBusy(id);
    setMessage(null);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const onCreate = () =>
    guard("novo", async () => {
      const result = await duplicateTheme("theme-default", "Novo modelo");
      if (!result.ok) return fail(result.message);
      router.push(`/admin/temas/${result.data.theme.id}`);
    });

  const onDuplicate = (theme: ThemeModel) =>
    guard(`dup-${theme.id}`, async () => {
      const result = await duplicateTheme(theme.id);
      if (!result.ok) return fail(result.message);
      ok(`Modelo duplicado como "${result.data.theme.name}" (rascunho).`);
      reload();
    });

  const onTogglePublish = (theme: ThemeModel) =>
    guard(`pub-${theme.id}`, async () => {
      const next: ThemeModel = {
        ...theme,
        status: theme.status === "publicado" ? "rascunho" : "publicado",
      };
      const result = await saveTheme(next);
      if (!result.ok) return fail(result.message);
      ok(
        next.status === "publicado"
          ? `"${next.name}" publicado — a loja aplica em até 5 minutos.`
          : `"${next.name}" voltou para rascunho.`,
      );
      reload();
    });

  const onArchive = (theme: ThemeModel) =>
    guard(`arc-${theme.id}`, async () => {
      const result = await saveTheme({ ...theme, status: "arquivado" });
      if (!result.ok) return fail(result.message);
      ok(`"${theme.name}" arquivado.`);
      reload();
    });

  if (!user) {
    return (
      <AdminLogin
        note={
          error?.failure === "sem-permissao"
            ? error.message
            : error
              ? error.message
              : undefined
        }
      />
    );
  }

  if (loading && !themes) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando modelos…</p>;
  }

  if (error && !themes) {
    return (
      <div className="card mx-auto max-w-lg gap-4 p-6 text-center">
        <p className="text-[#e5484d]">{error.message}</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={reload} className="btn btn-ghost">
            Tentar novamente
          </button>
          <button type="button" onClick={() => void logout()} className="btn btn-primary">
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--text-muted)]">
          {themes?.length ?? 0} modelos · conectado como{" "}
          <strong className="text-gold">{email ?? user.email}</strong>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCreate}
            disabled={busy !== null}
            className="btn btn-accent px-4 py-2 text-[11px]"
          >
            + Novo modelo
          </button>
          <button
            type="button"
            onClick={reload}
            disabled={busy !== null}
            className="btn btn-ghost px-4 py-2 text-[11px]"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="btn btn-ghost px-4 py-2 text-[11px]"
          >
            Sair
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            message.ok
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-[#e5484d]/15 text-[#e5484d]"
          }`}
        >
          {message.ok ? (
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <IconX className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </p>
      )}

      {/* lista de modelos */}
      <ul className="grid gap-4 lg:grid-cols-2">
        {(themes ?? []).map((theme) => {
          const phase = themePhase(theme);
          return (
            <li key={theme.id} className="card space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-display text-2xl">{theme.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    <code>{theme.key}</code> · {THEME_KIND_LABELS[theme.kind]} · {theme.version}
                    {theme.parentOf ? " · duplicado" : ""}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${PHASE_STYLES[phase]}`}
                >
                  {THEME_PHASE_LABELS[phase]}
                </span>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Agendamento: {formatWindow(theme)} · atualizado em{" "}
                {new Date(theme.updatedAt).toLocaleString("pt-BR")}
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/temas/${theme.id}`}
                  className="btn btn-primary px-4 py-2 text-[11px]"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onDuplicate(theme)}
                  className="btn btn-ghost px-4 py-2 text-[11px]"
                >
                  {busy === `dup-${theme.id}` ? "Duplicando…" : "Duplicar"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null || theme.kind === "default"}
                  onClick={() => onTogglePublish(theme)}
                  className="btn btn-ghost px-4 py-2 text-[11px]"
                >
                  {busy === `pub-${theme.id}` ? "Salvando…" : theme.status === "publicado" ? "Despublicar" : "Publicar"}
                </button>
                {theme.status !== "arquivado" && theme.kind !== "default" && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => onArchive(theme)}
                    className="btn btn-ghost px-4 py-2 text-[11px]"
                  >
                    Arquivar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {themes && themes.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum modelo encontrado — clique em “Novo modelo” para começar.
        </p>
      )}
    </div>
  );
}
