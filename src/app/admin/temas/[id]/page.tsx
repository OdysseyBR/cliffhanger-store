"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { useAdminThemes } from "@/components/admin/useAdminThemes";

/**
 * Editor de um modelo do Theme Engine (Fase 2 — /admin/temas/[id]).
 * Carrega a lista do painel e isola o modelo pelo id da rota.
 */
export default function AdminThemeEditorPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useStore();
  const { themes, error, loading, reload } = useAdminThemes();

  if (!user) {
    return <AdminLogin note={error ? error.message : undefined} />;
  }

  if (loading && !themes) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando modelo…</p>;
  }

  const theme = themes?.find((item) => item.id === id);

  if (!theme) {
    return (
      <div className="card mx-auto max-w-lg gap-4 p-6 text-center">
        <p className="text-display text-2xl text-gold">Modelo não encontrado</p>
        <p className="text-sm text-[var(--text-muted)]">
          {error ? error.message : `Nenhum modelo com id "${id}".`}
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={reload} className="btn btn-ghost">
            Tentar novamente
          </button>
          <Link href="/admin/temas" className="btn btn-primary">
            Voltar aos modelos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ThemeEditor
      theme={theme}
      onSaved={reload}
      onDeleted={() => router.push("/admin/temas")}
    />
  );
}
