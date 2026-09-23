"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/Providers";
import { menuButtons, megaMenu } from "@/lib/nav";

/**
 * Header da loja — somente a logo centralizada (Documento Mestre 3.2).
 * Não há menu tradicional dentro do header: os links de navegação ficam no
 * Menu Buttons (Home) e na barra de navegação secundária (<SiteNav />).
 * Ícones de utilidade (buscar/wishlist/carrinho/conta) são atalhos da
 * seção 6.1 e não configuram um menu.
 */
export function SiteHeader() {
  const { cartCount, wishlist, user } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur"
        style={{ background: "var(--header-bg)" }}
      >
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:h-20 sm:px-6 lg:px-8">
          {/* utilidades — esquerda */}
          <div className="absolute left-4 flex items-center gap-1 sm:left-6 lg:left-8">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)]"
              aria-label="Abrir navegação"
              aria-expanded={open}
            >
              <span className="text-lg">☰</span>
            </button>
            <Link
              href="/buscar"
              className="hidden h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)] sm:grid"
              aria-label="Buscar"
            >
              <span className="text-lg">⌕</span>
            </Link>
          </div>

          {/* logo centralizada */}
          <Link href="/" className="flex items-center" aria-label="Cliffhanger Store — início">
            <img
              src="/logo-cliffhanger-branco.svg"
              alt="Cliffhanger Store"
              className="logo-white h-9 w-auto sm:h-11"
              width={200}
              height={44}
            />
            <img
              src="/logo-cliffhanger-escuro.svg"
              alt="Cliffhanger Store"
              className="logo-dark hidden h-9 w-auto sm:h-11"
              width={200}
              height={44}
            />
          </Link>

          {/* utilidades — direita */}
          <div className="absolute right-4 flex items-center gap-1 sm:right-6 lg:right-8">
            <Link
              href="/wishlist"
              className="relative hidden h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)] sm:grid"
              aria-label={`Wishlist${wishlist.length ? ` (${wishlist.length})` : ""}`}
            >
              <span className="text-lg">♡</span>
              {wishlist.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#e5484d] px-1 text-[9px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <Link
              href="/conta"
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)]"
              aria-label={user ? "Minha conta" : "Entrar"}
            >
              <span className="text-lg">{user ? "●" : "◎"}</span>
            </Link>
            <Link
              href="/carrinho"
              className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)]"
              aria-label={`Carrinho${cartCount ? ` (${cartCount})` : ""}`}
            >
              <span className="text-lg">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* painel de navegação (fora do fluxo do header da Home) */}
        {open && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-raised)]">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
              <div>
                <h3 className="text-display mb-2 text-lg text-gold">Navegar</h3>
                <ul className="space-y-1 text-sm">
                  {menuButtons.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="transition hover:text-gold"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {megaMenu.map((group) => (
                <div key={group.title}>
                  <h3 className="text-display mb-2 text-lg text-gold">{group.title}</h3>
                  <ul className="space-y-1 text-sm">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item.label}-${item.href}`}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="transition hover:text-gold"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {!isHome && <SiteNav />}
    </>
  );
}

/** Barra de navegação secundária — presente apenas em páginas internas,
 *  mantendo o header da Home exclusivamente com a logo. */
function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface-raised)]/60">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {menuButtons.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                active
                  ? "bg-violet text-paper"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised-2)] hover:text-gold"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
