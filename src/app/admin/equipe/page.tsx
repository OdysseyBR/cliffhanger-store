"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import {
  fetchAdmins,
  grantAdmin,
  removeAdmin,
  updateAdmin,
} from "@/components/admin/admin-api";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import {
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLES,
  ADMIN_ROLE_LABELS,
  PERMISSION_GROUPS,
  can,
  type AdminRole,
} from "@/lib/roles";
import type { AdminUser } from "@/lib/types";

/**
 * Módulo Equipe (Documento de Correção §13) — concede, altera e revoga
 * os 7 papéis administrativos (Administrador, Editorial, Comercial,
 * Estoque, Atendimento, Marketing e Financeiro) e exibe a matriz de
 * permissões por módulo do painel.
 *
 * O super admin único aparece como acesso implícito e não é editável.
 */

interface FormState {
  email: string;
  name: string;
  role: AdminRole;
}

const BLANK: FormState = { email: "", name: "", role: "editorial" };

function CheckIcon({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={title}
      className="mx-auto h-4 w-4 text-gold"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}

/** Somente leitura — mesmo ícone em contorno (monocromático, currentColor). */
function ViewIcon({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={title}
      className="mx-auto h-4 w-4 text-gold opacity-60"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}

export default function AdminTeamPage() {
  const { user, notify } = useStore();
  const { me, can: canDo, loading: roleLoading } = useAdminPermissions();

  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [superAdmin, setSuperAdmin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"equipe" | "matriz">("equipe");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdmins();
    setLoading(false);
    if (result.ok) {
      setAdmins(result.data.admins);
      setSuperAdmin(result.data.superAdmin);
      setError(null);
    } else {
      setAdmins(null);
      setError(result.message);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // defere para um tick — setState dentro do corpo do efeito é proibido
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [user, load]);

  const canEdit = !roleLoading && (me?.role === "administrador" || canDo("admins.edit"));

  const handleGrant = async () => {
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      notify("Informe um e-mail válido para conceder o acesso.", "error");
      return;
    }
    setBusy(true);
    const result = await grantAdmin({ email, role: form.role, name: form.name.trim() });
    setBusy(false);
    if (result.ok) {
      notify(`Papel ${ADMIN_ROLE_LABELS[form.role]} concedido a ${email}`, "success");
      setForm(BLANK);
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  const handleRole = async (admin: AdminUser, role: AdminRole) => {
    setBusy(true);
    const result = await updateAdmin(admin.email, { role });
    setBusy(false);
    if (result.ok) {
      notify(`${admin.email} agora é ${ADMIN_ROLE_LABELS[role]}`, "success");
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  const handleToggle = async (admin: AdminUser) => {
    setBusy(true);
    const result = await updateAdmin(admin.email, { active: admin.active === false });
    setBusy(false);
    if (result.ok) {
      notify(admin.active === false ? `Acesso de ${admin.email} reativado` : `Acesso de ${admin.email} suspenso`, "success");
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (admin: AdminUser) => {
    if (!window.confirm(`Remover ${admin.email} da equipe administrativa?`)) return;
    setBusy(true);
    const result = await removeAdmin(admin.email);
    setBusy(false);
    if (result.ok) {
      notify("Acesso removido", "success");
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar a equipe e as permissões." />;
  }

  if (!canEdit && !roleLoading && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">admins.edit</code> — apenas o papel Administrador gerencia a
          equipe (§13).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Equipe e permissões</p>
          <p className="text-xs text-[var(--text-muted)]">
            Sete papéis do painel — Administrador, Editorial, Comercial, Estoque, Atendimento,
            Marketing e Financeiro (§13)
            {admins ? ` · ${admins.length} acesso(s) concedido(s)` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`btn px-3 py-2 text-[11px] ${tab === "equipe" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("equipe")}
          >
            Equipe
          </button>
          <button
            type="button"
            className={`btn px-3 py-2 text-[11px] ${tab === "matriz" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("matriz")}
          >
            Matriz de permissões
          </button>
        </div>
      </div>

      {tab === "equipe" && (
        <>
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-extrabold text-ink">
                ACESSO IMPLÍCITO
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{superAdmin || "—"}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  Super admin único — papel Administrador com todas as permissões, definido por{" "}
                  <code className="font-mono">SUPER_ADMIN_EMAIL</code>. Não pode ser revogado aqui.
                </p>
              </div>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <p className="text-display text-xl">Conceder acesso</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  E-mail da conta
                </span>
                <input
                  className="field"
                  type="email"
                  placeholder="nome@equipe.com"
                  value={form.email}
                  maxLength={120}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Nome (opcional)
                </span>
                <input
                  className="field"
                  placeholder="Como aparece no painel"
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Papel (§13)
                </span>
                <select
                  className="field"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))
                  }
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ADMIN_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {ADMIN_ROLE_DESCRIPTIONS[form.role]} A conta precisa se autenticar com e-mail
              verificado para o papel valer.
            </p>
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={busy}
              onClick={() => void handleGrant()}
            >
              {busy ? "Concedendo…" : "Conceder acesso"}
            </button>
          </div>

          {loading && <p className="text-sm text-[var(--text-muted)]">Carregando equipe…</p>}
          {error && <p className="text-sm text-[#e5484d]">{error}</p>}

          {!loading && !error && admins && admins.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum acesso concedido além do super admin — o painel está restrito a uma conta só.
            </p>
          )}

          {admins?.map((admin) => (
            <div key={admin.email} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{admin.name || admin.email}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {admin.email}
                  {admin.uid ? "" : " · conta ainda não autenticada"}
                  {admin.grantedBy ? ` · concedido por ${admin.grantedBy}` : ""}
                </p>
              </div>
              <select
                className="field w-auto min-w-[10rem]"
                value={admin.role}
                disabled={busy}
                onChange={(e) => void handleRole(admin, e.target.value as AdminRole)}
              >
                {ADMIN_ROLES.filter((role) => role !== "administrador").map((role) => (
                  <option key={role} value={role}>
                    {ADMIN_ROLE_LABELS[role]}
                  </option>
                ))}
                <option value="administrador">{ADMIN_ROLE_LABELS.administrador}</option>
              </select>
              <span
                className={
                  admin.active === false
                    ? "shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-bold text-[var(--text-muted)]"
                    : "shrink-0 rounded-full bg-gold px-3 py-1 text-[10px] font-extrabold text-ink"
                }
              >
                {admin.active === false ? "SUSPENSO" : "ATIVO"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  disabled={busy}
                  onClick={() => void handleToggle(admin)}
                >
                  {admin.active === false ? "Reativar" : "Suspender"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                  disabled={busy}
                  onClick={() => void handleRemove(admin)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "matriz" && (
        <div className="card overflow-x-auto p-5">
          <p className="text-display mb-1 text-xl">Matriz de permissões por papel</p>
          <p className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <CheckIcon title="Leitura e edição" />
            <span>leitura e edição</span>
            <ViewIcon title="Somente leitura" />
            <span>somente leitura</span>
            <span>— sem acesso</span>
          </p>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Módulo
                </th>
                {ADMIN_ROLES.map((role) => (
                  <th
                    key={role}
                    className="px-1 py-2 text-center font-bold uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    {ADMIN_ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <tr key={group.key} className="border-b border-[var(--border)]/60">
                  <td className="py-2 pr-3">
                    <span className="font-bold">{group.label}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {group.modules}
                    </span>
                  </td>
                  {ADMIN_ROLES.map((role) => {
                    const edit = group.edit ? can(role, group.edit) : false;
                    const view = can(role, group.view);
                    return (
                      <td key={role} className="px-1 py-2 text-center">
                        {edit ? (
                          <CheckIcon title="Leitura e edição" />
                        ) : view ? (
                          <ViewIcon title="Somente leitura" />
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
