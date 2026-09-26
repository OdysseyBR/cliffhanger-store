"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { fetchAudit } from "@/components/admin/admin-api";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import type { AuditLogEntry } from "@/lib/types";

/**
 * Módulo Auditoria (Documento de Correção §13) — registro/auditoria das
 * alterações administrativas relevantes: quem, qual papel, quando, o que
 * mudou e em qual módulo do painel (§12).
 */

const ACTION_STYLE: Record<string, string> = {
  criar: "bg-gold text-ink",
  editar: "border border-[var(--border)] text-[var(--text-muted)]",
  excluir: "border border-[#e5484d] text-[#e5484d]",
  ativar: "bg-gold text-ink",
  desativar: "border border-[var(--border)] text-[var(--text-muted)]",
  status: "border border-[var(--border)] text-[var(--text-muted)]",
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditPage() {
  const { user } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();

  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAudit({ module: module || undefined, limit: 200 });
    setLoading(false);
    if (result.ok) {
      setEntries(result.data.entries);
      setError(null);
    } else {
      setEntries(null);
      setError(result.message);
    }
  }, [module]);

  useEffect(() => {
    if (!user) return;
    // defere para um tick — setState dentro do corpo do efeito é proibido
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [user, load, reloadKey]);

  const modules = useMemo(() => {
    const set = new Set<string>([
      "Produtos",
      "Obras",
      "Universos",
      "Autores",
      "Categorias",
      "Coleções",
      "Cupons",
      "Banners",
      "Equipe",
      "Pedidos",
      "Estoque",
      "Lançamentos",
      "Notícias",
      "Configurações",
    ]);
    entries?.forEach((entry) => set.add(entry.module));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [entries]);

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para consultar a auditoria." />;
  }

  const allowed = roleLoading || can("audit.view");

  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">audit.view</code> — o registro de alterações é restrito ao
          papel Administrador (§13).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Auditoria</p>
          <p className="text-xs text-[var(--text-muted)]">
            Registro das alterações administrativas relevantes — ator, papel, data, módulo e o que
            mudou (§13)
            {entries ? ` · ${entries.length} registro(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="field w-auto"
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="">Todos os módulos</option>
            {modules.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost px-4 py-2 text-[11px]"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Atualizar
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando auditoria…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {!loading && !error && entries && entries.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma alteração registrada{module ? ` no módulo ${module}` : ""} ainda — o registro é
          gravado a cada escrita do painel.
        </p>
      )}

      {entries && entries.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-start gap-3 p-4">
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                  ACTION_STYLE[entry.action] ?? "border border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {entry.action}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{entry.summary}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {formatWhen(entry.at)} · {entry.actor}
                  {entry.role ? ` · papel ${entry.role}` : ""} · {entry.module} ·{" "}
                  <span className="font-mono">{entry.entityId}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
