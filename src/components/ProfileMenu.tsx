"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/Providers";
import { IconUser } from "@/components/Icons";

/**
 * §1.1 — menu rápido do perfil: hover no desktop, toque no mobile.
 * Resumo da conta + atalhos; o clique no ícone leva ao Centro da Conta
 * (§2). Sem hover no mobile: o primeiro toque abre o menu, o segundo
 * (ou o link "Centro da Conta") navega.
 */

const SHORTCUTS = [
  { href: "/conta/perfil", label: "Meu perfil" },
  { href: "/conta/pedidos", label: "Meus pedidos" },
  { href: "/conta/biblioteca", label: "Minha biblioteca" },
  { href: "/conta/wishlist", label: "Wishlist" },
  { href: "/conta/colecao", label: "Minha coleção" },
  { href: "/conta/cliffhanger-plus", label: "Cliffhanger+" },
  { href: "/conta/configuracoes", label: "Configurações" },
];

export function ProfileMenu() {
  const { user, logout } = useStore();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Link
        href="/conta"
        className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)]"
        aria-label="Entrar"
      >
        <IconUser logged={false} />
      </Link>
    );
  }

  const initials = (user.displayName ?? user.email ?? "?").slice(0, 2).toUpperCase();

  const handleIconClick = (event: React.MouseEvent) => {
    if (window.matchMedia("(hover: none)").matches && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/conta"
        onClick={handleIconClick}
        onFocus={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[var(--surface-raised)]"
        aria-label="Minha conta"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <IconUser logged />
        )}
      </Link>

      {open && (
        <div
          role="menu"
          aria-label="Atalhos da conta"
          className="absolute right-0 z-50 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl"
        >
          <Link
            href="/conta"
            onClick={() => setOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--surface-raised)]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-sm font-extrabold text-white">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                {user.displayName ?? "Leitor(a)"}
              </span>
              <span className="block truncate text-xs text-[var(--text-muted)]">
                {user.email}
              </span>
            </span>
          </Link>

          <nav className="grid gap-0.5">
            {SHORTCUTS.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-raised)] hover:text-gold"
              >
                {shortcut.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[#e5484d]"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
