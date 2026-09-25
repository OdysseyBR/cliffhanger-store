"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Menu de módulos do painel — Documento de Correção §12 (26 módulos
 * oficiais; §2: sem módulo de Theme Engine/Modelos). Os módulos ainda não
 * implementados ficam visíveis porém indisponíveis, para o painel já
 * mostrar a estrutura completa.
 */

interface NavItem {
  label: string;
  href?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
  { title: "Geral", items: [{ label: "Dashboard", href: "/admin" }] },
  {
    title: "Catálogo",
    items: [
      { label: "Produtos", href: "/admin/produtos" },
      { label: "Obras" },
      { label: "Universos" },
      { label: "Autores" },
      { label: "Categorias" },
      { label: "Coleções" },
    ],
  },
  {
    title: "Operação",
    items: [
      { label: "Estoque" },
      { label: "Pedidos" },
      { label: "Clientes" },
      { label: "Pré-vendas" },
    ],
  },
  {
    title: "Digital",
    items: [
      { label: "E-books" },
      { label: "Audiobooks" },
      { label: "Biblioteca Digital" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Cupons" },
      { label: "Promoções" },
      { label: "Cliffhanger Club" },
      { label: "Avaliações" },
      { label: "Notificações" },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { label: "Banners", href: "/admin/banners" },
      { label: "Home" },
      { label: "Notícias" },
      { label: "Lançamentos" },
    ],
  },
  {
    title: "Dados",
    items: [{ label: "Relatórios" }, { label: "Financeiro" }, { label: "Configurações" }],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Módulos do painel" className="mb-6 space-y-3 border-b border-[var(--border)] pb-5">
      {ADMIN_NAV.map((group) => (
        <div key={group.title} className="flex flex-wrap items-center gap-2">
          <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {group.title}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              if (!item.href) {
                return (
                  <span
                    key={item.label}
                    title="Em breve — módulo do roadmap do Documento de Correção"
                    className="cursor-not-allowed rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-muted)] opacity-60"
                  >
                    {item.label}
                  </span>
                );
              }
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-gold text-ink"
                      : "border border-[var(--border)] text-[var(--text-muted)] hover:border-gold hover:text-gold"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
