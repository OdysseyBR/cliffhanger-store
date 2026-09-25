import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

/** Casca do painel (Documento de Correção §12 — módulos do admin), fora da loja pública. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <p className="text-display text-3xl text-gold">Painel administrativo</p>
          <p className="text-xs text-[var(--text-muted)]">
            Cliffhanger Store — 26 módulos (Documento de Correção §12)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn btn-ghost px-4 py-2 text-[11px]">
            Ver a loja
          </Link>
        </div>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
