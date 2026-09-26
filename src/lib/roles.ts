/**
 * §13 — Permissões administrativas (Documento de Correção).
 *
 * Define os 7 papéis exigidos pelo documento (Administrador, Editorial,
 * Comercial, Estoque, Atendimento, Marketing e Financeiro) e a matriz de
 * permissões por módulo do painel (§12). Módulo compartilhado entre
 * servidor (admin-guard) e cliente (AdminNav) — por isso NÃO importa
 * "server-only".
 *
 * O super admin único (SUPER_ADMIN_EMAIL) recebe implicitamente o papel
 * "administrador" com todas as permissões. Demais contas precisam de um
 * registro ativo na coleção `adminUsers`.
 */

export const ADMIN_ROLES = [
  "administrador",
  "editorial",
  "comercial",
  "estoque",
  "atendimento",
  "marketing",
  "financeiro",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  administrador: "Administrador",
  editorial: "Editorial",
  comercial: "Comercial",
  estoque: "Estoque",
  atendimento: "Atendimento",
  marketing: "Marketing",
  financeiro: "Financeiro",
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  administrador: "Acesso total ao painel, incluindo equipe e auditoria.",
  editorial: "Catálogo editorial, notícias, lançamentos e pré-vendas.",
  comercial: "Produtos, cupons, promoções, clube e leitura comercial.",
  estoque: "Estoque, entradas/saídas, alertas e leitura de pedidos.",
  atendimento: "Pedidos, clientes e avaliações — fala com o cliente.",
  marketing: "Banners, home, notícias, campanhas, clube e notificações.",
  financeiro: "Financeiro, relatórios, pedidos e leitura de cupons.",
};

export const ADMIN_PERMISSIONS = [
  "dashboard.view",
  "products.view",
  "products.edit",
  "catalog.view",
  "catalog.edit",
  "stock.view",
  "stock.edit",
  "orders.view",
  "orders.edit",
  "customers.view",
  "digital.view",
  "digital.edit",
  "preorders.view",
  "preorders.edit",
  "coupons.view",
  "coupons.edit",
  "promotions.view",
  "promotions.edit",
  "club.view",
  "club.edit",
  "reviews.view",
  "reviews.edit",
  "banners.view",
  "banners.edit",
  "home.view",
  "home.edit",
  "news.view",
  "news.edit",
  "launches.view",
  "launches.edit",
  "notifications.view",
  "notifications.edit",
  "reports.view",
  "finance.view",
  "settings.view",
  "settings.edit",
  "admins.view",
  "admins.edit",
  "audit.view",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ALL = ADMIN_PERMISSIONS;

const VIEW_ONLY = (...perms: AdminPermission[]) => perms;

/**
 * Matriz de permissões por papel. `administrador` recebe tudo
 * (`ADMIN_PERMISSIONS`) — os demais recebem apenas o que a função exige.
 */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  administrador: ALL,
  editorial: VIEW_ONLY(
    "dashboard.view",
    "products.view",
    "catalog.view",
    "catalog.edit",
    "news.view",
    "news.edit",
    "launches.view",
    "launches.edit",
    "preorders.view",
    "preorders.edit",
    "home.view",
    "reviews.view",
  ),
  comercial: VIEW_ONLY(
    "dashboard.view",
    "products.view",
    "products.edit",
    "catalog.view",
    "coupons.view",
    "coupons.edit",
    "promotions.view",
    "promotions.edit",
    "club.view",
    "club.edit",
    "orders.view",
    "customers.view",
    "launches.view",
    "reports.view",
    "finance.view",
  ),
  estoque: VIEW_ONLY(
    "dashboard.view",
    "stock.view",
    "stock.edit",
    "products.view",
    "orders.view",
    "preorders.view",
    "launches.view",
    "digital.view",
  ),
  atendimento: VIEW_ONLY(
    "dashboard.view",
    "orders.view",
    "orders.edit",
    "customers.view",
    "reviews.view",
    "reviews.edit",
    "products.view",
    "coupons.view",
  ),
  marketing: VIEW_ONLY(
    "dashboard.view",
    "banners.view",
    "banners.edit",
    "home.view",
    "home.edit",
    "news.view",
    "news.edit",
    "launches.view",
    "launches.edit",
    "notifications.view",
    "notifications.edit",
    "promotions.view",
    "promotions.edit",
    "coupons.view",
    "coupons.edit",
    "club.view",
    "club.edit",
    "reviews.view",
    "catalog.view",
    "reports.view",
  ),
  financeiro: VIEW_ONLY(
    "dashboard.view",
    "finance.view",
    "reports.view",
    "orders.view",
    "customers.view",
    "coupons.view",
    "promotions.view",
  ),
};

/** Permissões efetivas de um papel (matriz §13). */
export function permissionsFor(role: AdminRole): AdminPermission[] {
  return [...(ADMIN_ROLE_PERMISSIONS[role] ?? [])];
}

/** Consulta da matriz §13 — usada pelo guard do servidor e pela UI. */
export function can(role: AdminRole, permission: AdminPermission): boolean {
  return (ADMIN_ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

/** Papel válido a partir de um valor vindo do Firestore/cliente. */
export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/** Agrupamento usado na matriz de permissões da tela Equipe (§13). */
export interface PermissionGroup {
  key: string;
  label: string;
  /** Módulos do §12 cobertos pelo grupo. */
  modules: string;
  view: AdminPermission;
  edit: AdminPermission | null;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: "dashboard", label: "Dashboard", modules: "Visão geral do painel", view: "dashboard.view", edit: null },
  { key: "products", label: "Produtos", modules: "Catálogo de venda", view: "products.view", edit: "products.edit" },
  { key: "catalog", label: "Catálogo editorial", modules: "Obras, Universos, Autores, Categorias, Coleções", view: "catalog.view", edit: "catalog.edit" },
  { key: "stock", label: "Estoque", modules: "Estoque atual, entradas, saídas e alertas", view: "stock.view", edit: "stock.edit" },
  { key: "orders", label: "Pedidos", modules: "Pedidos e acompanhamento", view: "orders.view", edit: "orders.edit" },
  { key: "customers", label: "Clientes", modules: "Clientes e compras", view: "customers.view", edit: null },
  { key: "digital", label: "Biblioteca Digital", modules: "E-books, Audiobooks, Biblioteca", view: "digital.view", edit: "digital.edit" },
  { key: "preorders", label: "Pré-vendas", modules: "Pré-vendas e lotes", view: "preorders.view", edit: "preorders.edit" },
  { key: "coupons", label: "Cupons", modules: "Cupons de desconto", view: "coupons.view", edit: "coupons.edit" },
  { key: "promotions", label: "Promoções", modules: "Promoções e ofertas", view: "promotions.view", edit: "promotions.edit" },
  { key: "club", label: "Cliffhanger Club", modules: "Clube de benefícios", view: "club.view", edit: "club.edit" },
  { key: "reviews", label: "Avaliações", modules: "Avaliações de clientes", view: "reviews.view", edit: "reviews.edit" },
  { key: "banners", label: "Banners", modules: "Banners da loja", view: "banners.view", edit: "banners.edit" },
  { key: "home", label: "Home", modules: "Composição da home", view: "home.view", edit: "home.edit" },
  { key: "news", label: "Notícias", modules: "Notícias e editorial", view: "news.view", edit: "news.edit" },
  { key: "launches", label: "Lançamentos", modules: "Lançamentos", view: "launches.view", edit: "launches.edit" },
  { key: "notifications", label: "Notificações", modules: "Notificações", view: "notifications.view", edit: "notifications.edit" },
  { key: "reports", label: "Relatórios", modules: "Relatórios do painel", view: "reports.view", edit: null },
  { key: "finance", label: "Financeiro", modules: "Financeiro", view: "finance.view", edit: null },
  { key: "settings", label: "Configurações", modules: "Configurações", view: "settings.view", edit: "settings.edit" },
  { key: "admins", label: "Equipe", modules: "Papéis e permissões (§13)", view: "admins.view", edit: "admins.edit" },
  { key: "audit", label: "Auditoria", modules: "Registro de alterações (§13)", view: "audit.view", edit: null },
];
