"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import type { AdminPermission } from "@/lib/roles";

/**
 * Menu lateral do painel em árvore — Etapa T (hierarquia do painel).
 * Reorganiza os módulos nos 9 grupos operacionais (Loja, Vendas,
 * Clientes, Digital, Cliffhanger+, Aplicativo, Site, Relatórios e
 * Sistema) sobre os módulos do §12; Obras saiu do painel (substituído
 * por Produtos por tipo) e E-books/Audiobooks agora vivem como abas
 * de Produtos.
 *
 * Grupos são colapsáveis (botão com `aria-expanded`); itens mantêm o
 * contrato anterior: bloqueio por permissão (§13) com o motivo no
 * `title` e pílula "Em breve" para o que ainda não existe.
 *
 * A query string (deep-links `?aba=` do Relatórios) vem de
 * `useSearchParams`, que exige uma fronteira `Suspense` acima na
 * pré-renderização (doc Next) — o fallback é o mesmo menu com query
 * vazia, visualmente idêntico até a hidratação.
 */

interface NavItem {
  label: string;
  href?: string;
  /** permissão de leitura exigida (§13) — só faz sentido com href */
  perm?: AdminPermission;
  /** comparação exata (evita itens filhos marcando o pai) */
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const DASHBOARD: NavItem = {
  label: "Dashboard",
  href: "/admin",
  perm: "dashboard.view",
  exact: true,
};

const ADMIN_NAV: NavGroup[] = [
  {
    title: "Loja",
    items: [
      { label: "Produtos", href: "/admin/produtos", perm: "products.view" },
      { label: "Categorias", href: "/admin/categorias", perm: "catalog.view" },
      { label: "Coleções", href: "/admin/colecoes", perm: "catalog.view" },
      { label: "Universos", href: "/admin/universos", perm: "catalog.view" },
      { label: "Autores", href: "/admin/autores", perm: "catalog.view" },
      { label: "Estoque", href: "/admin/estoque", perm: "stock.view" },
      { label: "Avaliações", href: "/admin/avaliacoes", perm: "reviews.view" },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Pedidos", href: "/admin/pedidos", perm: "orders.view" },
      { label: "Pré-vendas", href: "/admin/pre-vendas", perm: "preorders.view" },
      { label: "Cupons", href: "/admin/cupons", perm: "coupons.view" },
      { label: "Promoções", href: "/admin/promocoes", perm: "promotions.view" },
    ],
  },
  {
    title: "Clientes",
    items: [{ label: "Clientes", href: "/admin/clientes", perm: "customers.view" }],
  },
  {
    title: "Digital",
    items: [
      { label: "Biblioteca", href: "/admin/biblioteca-digital", perm: "digital.view" },
      { label: "QR Codes", href: "/admin/qrcodes", perm: "digital.view" },
    ],
  },
  {
    title: "Cliffhanger+",
    items: [
      { label: "Planos", href: "/admin/cliffhanger-plus", perm: "plus.view", exact: true },
      { label: "Drops", href: "/admin/cliffhanger-plus/drops", perm: "plus.view" },
      { label: "Clube do Leitor", href: "/admin/cliffhanger-plus/clube", perm: "plus.view" },
      { label: "Cliffhanger Club", href: "/admin/clube", perm: "club.view" },
    ],
  },
  {
    title: "Aplicativo",
    items: [{ label: "Aplicativo", href: "/admin/aplicativo", perm: "notifications.view" }],
  },
  {
    title: "Site",
    items: [
      { label: "Home", href: "/admin/home", perm: "home.view" },
      { label: "Banners", href: "/admin/banners", perm: "banners.view" },
      { label: "Notícias", href: "/admin/noticias", perm: "news.view" },
      { label: "Lançamentos", href: "/admin/lancamentos", perm: "launches.view" },
      { label: "Notificações", href: "/admin/notificacoes", perm: "notifications.view" },
    ],
  },
  {
    title: "Relatórios",
    items: [
      { label: "Vendas", href: "/admin/relatorios?aba=vendas", perm: "reports.view" },
      { label: "Produtos", href: "/admin/relatorios?aba=produtos", perm: "reports.view" },
      { label: "Financeiro", href: "/admin/financeiro", perm: "finance.view" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Equipe", href: "/admin/equipe", perm: "admins.view" },
      { label: "Permissões", href: "/admin/permissoes", perm: "admins.view" },
      { label: "Auditoria", href: "/admin/auditoria", perm: "audit.view" },
      { label: "Integrações", href: "/admin/integracoes", perm: "settings.view" },
      { label: "Configurações", href: "/admin/configuracoes", perm: "settings.view" },
    ],
  },
];

/** Seta monocromática (currentColor) do grupo colapsável. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5l5 4.5-5 4.5" />
    </svg>
  );
}

export function AdminNav() {
  return (
    <Suspense fallback={<NavBody search="" />}>
      <NavWithSearch />
    </Suspense>
  );
}

function NavWithSearch() {
  const searchParams = useSearchParams();
  return <NavBody search={searchParams.toString()} />;
}

function NavBody({ search }: { search: string }) {
  const pathname = usePathname();
  const { me, can } = useAdminPermissions();

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_NAV.map((group) => [group.title, true])),
  );

  function isActive(item: NavItem): boolean {
    if (!item.href) return false;
    const [path, query] = item.href.split("?");
    if (item.exact || path === "/admin") return pathname === path;
    if (query) {
      const wanted = new URLSearchParams(query);
      const atual = new URLSearchParams(search);
      return (
        pathname === path && [...wanted].every(([key, value]) => atual.get(key) === value)
      );
    }
    return pathname.startsWith(path);
  }

  function renderItem(item: NavItem) {
    const semPermissao = Boolean(item.href && item.perm && me && !can(item.perm));
    if (!item.href || semPermissao) {
      return (
        <span
          title={
            semPermissao
              ? `Sem permissão — papel ${me?.roleLabel ?? ""} não acessa este módulo (§13)`
              : "Em breve — módulo do roadmap do Documento de Correção"
          }
          className="flex cursor-not-allowed items-center rounded px-2 py-1.5 text-xs text-[var(--text-muted)] opacity-60"
        >
          {item.label}
        </span>
      );
    }
    const ativo = isActive(item);
    return (
      <Link
        href={item.href}
        aria-current={ativo ? "page" : undefined}
        className={`flex items-center rounded px-2 py-1.5 text-xs font-bold transition ${
          ativo
            ? "bg-gold text-ink"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-gold"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <nav aria-label="Módulos do painel" className="space-y-1">
      <ul className="border-b border-[var(--border)] pb-2">
        <li>{renderItem(DASHBOARD)}</li>
      </ul>
      {ADMIN_NAV.map((group) => {
        const aberto = open[group.title];
        return (
          <div key={group.title}>
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() =>
                setOpen((prev) => ({ ...prev, [group.title]: !prev[group.title] }))
              }
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition hover:text-gold"
            >
              <Chevron open={aberto} />
              {group.title}
            </button>
            {aberto && (
              <ul className="mb-2 space-y-0.5 pl-3">
                {group.items.map((item) => (
                  <li key={item.label}>{renderItem(item)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
