"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAdminRole } from "@/components/admin/useAdminRole";
import type { AdminPermission } from "@/lib/roles";
import type { AdminMe } from "@/components/admin/admin-api";

/**
 * §13 — contexto único de papel/permissões do painel.
 *
 * A resolução acontece UMA vez por sessão no shell do `/admin` e é
 * compartilhada pelo menu (AdminNav), pelo selo de papel e pelas telas
 * que precisam checar permissão antes de liberar ações.
 */

interface AdminPermissionsValue {
  me: AdminMe | null;
  loading: boolean;
  error: string | null;
  can: (permission: AdminPermission) => boolean;
  reload: () => void;
}

/** Valor usado quando o shell não está presente: não restringe (o servidor restringe). */
const UNRESTRICTED: AdminPermissionsValue = {
  me: null,
  loading: false,
  error: null,
  can: () => true,
  reload: () => {},
};

const AdminPermissionsContext = createContext<AdminPermissionsValue>(UNRESTRICTED);

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const value = useAdminRole();
  return (
    <AdminPermissionsContext.Provider value={value}>{children}</AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions(): AdminPermissionsValue {
  return useContext(AdminPermissionsContext);
}

/** Selo com o papel da sessão (§13) — exibido no cabeçalho do painel. */
export function AdminRoleBadge() {
  const { me, loading, error } = useAdminPermissions();
  if (loading || error || !me) return null;

  return (
    <span
      className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-[var(--border)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
      title={`${me.roleLabel} — ${me.email}`}
    >
      <span className="text-gold">{me.roleLabel}</span>
      <span className="truncate font-mono normal-case">{me.email}</span>
    </span>
  );
}
