import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  AdminPermissionsProvider,
  AdminRoleBadge,
} from "@/components/admin/AdminRoleProvider";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

/**
 * Casca do painel (Documento de Correção §12 — módulos do admin), fora da
 * loja pública. O provider resolve o papel/permissões da sessão (§13) uma
 * única vez e alimenta o menu e o selo de papel. A partir da Etapa T o
 * menu é uma sidebar em árvore (grupos colapsáveis) à esquerda do
 * conteúdo.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPermissionsProvider>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <p className="text-display text-3xl text-gold">Painel administrativo</p>
            <p className="text-xs text-[var(--text-muted)]">
              Cliffhanger Store — módulos da loja, permissões e auditoria (§13)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminRoleBadge />
            <Link href="/" className="btn btn-ghost px-4 py-2 text-[11px]">
              Ver a loja
            </Link>
          </div>
        </header>
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-[var(--border)] lg:pr-4">
            <AdminNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AdminPermissionsProvider>
  );
}
