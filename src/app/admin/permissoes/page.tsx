"use client";

import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { PermissionsMatrix } from "@/components/admin/PermissionsMatrix";
import { ADMIN_ROLE_DESCRIPTIONS, ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/lib/roles";

/**
 * SISTEMA → Permissões (Etapa T) — página dedicada da matriz papel ×
 * módulo (§13), somente leitura: os papéis são definidos em
 * `roles.ts`; para conceder/revogar membros da equipe, use SISTEMA →
 * Equipe. Acesso: `admins.view` (e o super admin implícito).
 */
export default function AdminPermissionsPage() {
  const { user } = useStore();
  const { me, can, loading } = useAdminPermissions();

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para ver as permissões." />;
  }

  const allowed = loading || me?.role === "administrador" || can("admins.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">admins.view</code> — a matriz fica com a equipe que
          administra o painel (§13).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-display text-3xl text-gold">Permissões</p>
        <p className="text-xs text-[var(--text-muted)]">
          Matriz papel × módulo — somente leitura (§13). Para alterar quem acessa o quê,
          conceda ou revogue papéis em Equipe.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_ROLES.map((role) => (
          <div key={role} className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
              {ADMIN_ROLE_LABELS[role]}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {ADMIN_ROLE_DESCRIPTIONS[role]}
            </p>
          </div>
        ))}
      </div>

      <PermissionsMatrix />

      <p className="text-[11px] text-[var(--text-muted)]">
        O super admin único (Administrador definido por <code className="font-mono">SUPER_ADMIN_EMAIL</code>)
        tem acesso implícito a todos os módulos e não aparece como papel editável.
      </p>
    </div>
  );
}
