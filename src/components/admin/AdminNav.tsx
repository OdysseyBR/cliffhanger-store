"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import type { AdminPermission } from "@/lib/roles";

/**
 * Menu de módulos do painel — Documento de Correção §12 (26 módulos
 * oficiais; §2: sem módulo de Theme Engine/Modelos) + §13 (segurança).
 *
 * Os módulos ainda não implementados ficam visíveis porém indisponíveis,
 * para o painel já mostrar a estrutura completa. Módulos implementados
 * cujo papel da sessão não possui a permissão de leitura também ficam
 * indisponíveis, com o motivo no `title` (§13).
 */

interface NavItem {
  label: string;
  href?: string;
  /** permissão de leitura exigida (§13) — só faz sentido com href */
  perm?: AdminPermission;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
  { title: "Geral", items: [{ label: "Dashboard", href: "/admin", perm: "dashboard.view" }] },
  {
    title: "Catálogo",
    items: [
      { label: "Produtos", href: "/admin/produtos", perm: "products.view" },
      { label: "Obras", href: "/admin/obras", perm: "catalog.view" },
      { label: "Universos", href: "/admin/universos", perm: "catalog.view" },
      { label: "Autores", href: "/admin/autores", perm: "catalog.view" },
      { label: "Categorias", href: "/admin/categorias", perm: "catalog.view" },
      { label: "Coleções", href: "/admin/colecoes", perm: "catalog.view" },
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
      { label: "Cupons", href: "/admin/cupons", perm: "coupons.view" },
      { label: "Promoções" },
      { label: "Cliffhanger Club" },
      { label: "Avaliações" },
      { label: "Notificações" },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { label: "Banners", href: "/admin/banners", perm: "banners.view" },
      { label: "Home" },
      { label: "Notícias" },
      { label: "Lançamentos" },
    ],
  },
  {
    title: "Dados",
    items: [{ label: "Relatórios" }, { label: "Financeiro" }, { label: "Configurações" }],
  },
  {
    title: "Segurança",
    items: [
      { label: "Equipe", href: "/admin/equipe", perm: "admins.view" },
      { label: "Auditoria", href: "/admin/auditoria", perm: "audit.view" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const { me, can } = useAdminPermissions();

  return (
    <nav aria-label="Módulos do painel" className="mb-6 space-y-3 border-b border-[var(--border)] pb-5">
      {ADMIN_NAV.map((group) => (
        <div key={group.title} className="flex flex-wrap items-center gap-2">
          <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {group.title}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const blocked = Boolean(item.href && item.perm && me && !can(item.perm));

              if (!item.href || blocked) {
                return (
                  <span
                    key={item.label}
                    title={
                      blocked
                        ? `Sem permissão — papel ${me?.roleLabel ?? ""} não acessa este módulo (§13)`
                        : "Em breve — módulo do roadmap do Documento de Correção"
                    }
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
