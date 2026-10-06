"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/components/Providers";
import { AuthCard } from "@/components/AuthCard";
import { Page } from "@/components/Page";

/**
 * §3 — casca do Centro da Conta: navegação própria e consistente entre
 * as páginas internas. Sidebar no desktop; lista de seções no mobile.
 * Sem sessão, oferece a entrada (a conta é o elo central §37).
 */

const GROUPS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Minha conta",
    links: [
      { href: "/conta", label: "Visão geral" },
      { href: "/conta/perfil", label: "Perfil" },
      { href: "/conta/pedidos", label: "Pedidos" },
      { href: "/conta/biblioteca", label: "Biblioteca" },
      { href: "/conta/colecao", label: "Minha coleção" },
      { href: "/conta/wishlist", label: "Wishlist" },
      { href: "/conta/cliffhanger-plus", label: "Cliffhanger+" },
    ],
  },
  {
    title: "Configurações",
    links: [
      { href: "/conta/configuracoes/dados", label: "Dados pessoais" },
      { href: "/conta/configuracoes/enderecos", label: "Endereços" },
      { href: "/conta/configuracoes/pagamentos", label: "Pagamentos" },
      { href: "/conta/configuracoes/seguranca", label: "Segurança" },
      { href: "/conta/configuracoes/notificacoes", label: "Notificações" },
      { href: "/conta/configuracoes/privacidade", label: "Privacidade" },
      { href: "/conta/configuracoes/preferencias", label: "Preferências" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/conta") return pathname === "/conta";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useStore();
  const pathname = usePathname();

  if (!authLoading && !user) {
    return (
      <Page>
        <div className="mx-auto max-w-md py-10">
          {/* P1.8 — branch substitui os filhos: este é o único h1 da rota. */}
          <h1 className="sr-only">Minha conta</h1>
          <AuthCard />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Centro da Conta" className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {authLoading ? (
            <div className="card p-4 text-sm text-[var(--text-muted)]">Carregando conta…</div>
          ) : (
            GROUPS.map((group) => (
              <div key={group.title} className="card p-3">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {group.title}
                </p>
                <ul className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-1">
                  {group.links.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={`block rounded-lg px-3 py-2 text-sm transition ${
                            active
                              ? "bg-gold font-bold text-ink"
                              : "hover:bg-[var(--surface-raised)] hover:text-gold"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </Page>
  );
}
