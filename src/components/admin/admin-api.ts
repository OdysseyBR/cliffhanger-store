"use client";

import { getClientAuth, firebaseEnabled } from "@/lib/firebase";
import type { AdminPermission, AdminRole } from "@/lib/roles";
import type { CatalogEntity } from "@/lib/catalog-fields";
import type { DigitalFormState, DigitalModuleKind } from "@/lib/digital-fields";
import type { LaunchContentForm } from "@/lib/content-fields";
import type { AdminStockItem, StockAdjustInput } from "@/lib/stock-fields";
import type {
  AdminDropRow,
  ClubBox,
  DropClaim,
  PlusDrop,
  PlusPlan,
  PlusStats,
} from "@/lib/plus-fields";
import type { AppContent } from "@/lib/app-content";
import type { QrCatalogOption, QrCodeEntry } from "@/lib/qr-fields";
import type {
  AdminCustomer,
  AdminLibrary,
  AdminUser,
  AuditLogEntry,
  Author,
  Banner,
  Category,
  ClubBenefit,
  ClubMember,
  Collection,
  Coupon,
  FinanceSummary,
  HomeOverride,
  Launch,
  NewsItem,
  Order,
  OrderStatus,
  Product,
  Promotion,
  ReportSummary,
  Review,
  ShopSettings,
  StockMovement,
  StoreNotification,
  Universe,
  Work,
} from "@/lib/types";

/**
 * Cliente da API do painel — anexa o ID token do Firebase e
 * traduz os status HTTP em falhas amigáveis para o painel /admin.
 */

export type AdminFailure = "sem-firebase" | "sem-sessao" | "sem-permissao" | "erro";

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: AdminFailure; message: string };

export async function adminFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: string },
): Promise<AdminResult<T>> {
  if (!firebaseEnabled) {
    return {
      ok: false,
      failure: "sem-firebase",
      message: "Firebase não configurado neste ambiente — admin indisponível.",
    };
  }

  const user = getClientAuth()?.currentUser ?? null;
  if (!user) {
    return {
      ok: false,
      failure: "sem-sessao",
      message: "Entre com uma conta administradora.",
    };
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    return { ok: false, failure: "sem-sessao", message: "Não foi possível validar a sessão." };
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: init?.body,
    });
  } catch {
    return { ok: false, failure: "erro", message: "Falha de rede ao falar com o servidor." };
  }

  if (res.status === 401) {
    return { ok: false, failure: "sem-sessao", message: "Sessão inválida ou expirada — entre novamente." };
  }
  if (res.status === 403) {
    return {
      ok: false,
      failure: "sem-permissao",
      message: "Seu papel não tem permissão para esta operação do painel (§13).",
    };
  }
  if (res.status === 503) {
    return { ok: false, failure: "erro", message: "Firestore não configurado neste ambiente." };
  }

  let payload: (T & { error?: string }) | null = null;
  try {
    payload = (await res.json()) as T & { error?: string };
  } catch {
    return { ok: false, failure: "erro", message: "Resposta inválida do servidor." };
  }

  if (!res.ok || payload?.error) {
    return { ok: false, failure: "erro", message: payload?.error ?? `Erro ${res.status}.` };
  }

  return { ok: true, data: payload };
}

/** Criador de itens (Doc Mestre 11.2) — cria (POST) ou atualiza (PUT). */
export function saveProduct(product: Product, isNew: boolean) {
  return adminFetch<{ product: Product }>(
    isNew ? "/api/products" : `/api/products/${product.id}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ product }) },
  );
}

export function deleteProduct(id: string) {
  return adminFetch<{ ok: boolean }>(`/api/products/${id}`, {
    method: "DELETE",
  });
}

/** Pedidos (Doc Mestre 11.1 — Dashboard/módulo Pedidos) — exige super admin. */
export function fetchOrders() {
  return adminFetch<{ orders: Order[] }>("/api/orders");
}

/** Banners (Documento de Correção §5) — arte final única por upload. */
export function fetchBanners() {
  return adminFetch<{ banners: Banner[] }>("/api/admin/banners");
}

export function saveBanner(banner: Banner, isNew: boolean) {
  return adminFetch<{ banner: Banner }>(
    isNew ? "/api/admin/banners" : `/api/admin/banners/${banner.id}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ banner }) },
  );
}

export function deleteBanner(id: string) {
  return adminFetch<{ ok: boolean }>(`/api/admin/banners/${id}`, {
    method: "DELETE",
  });
}

/** Cupons (Documento de Correção §17/§12) — coleção `coupons`, id = código. */
export type AdminCoupon = Coupon & { id: string };

export function fetchCoupons() {
  return adminFetch<{ coupons: AdminCoupon[] }>("/api/admin/coupons");
}

export function saveCoupon(coupon: Coupon, isNew: boolean) {
  return adminFetch<{ coupon: AdminCoupon }>(
    isNew ? "/api/admin/coupons" : `/api/admin/coupons/${coupon.code}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ coupon }) },
  );
}

export function deleteCoupon(code: string) {
  return adminFetch<{ ok: boolean }>(`/api/admin/coupons/${code}`, {
    method: "DELETE",
  });
}

/** §12 — grupo Catálogo (Obras, Universos, Autores, Categorias, Coleções). */
export type AdminCatalogItem = Work | Universe | Author | Category | Collection;

export function fetchCatalogItems<T extends AdminCatalogItem = AdminCatalogItem>(
  entity: CatalogEntity,
) {
  return adminFetch<{ items: T[] }>(`/api/admin/catalog/${entity}`);
}

export function saveCatalogItem<T extends AdminCatalogItem>(
  entity: CatalogEntity,
  item: T,
  isNew: boolean,
) {
  return adminFetch<{ item: T }>(
    isNew ? `/api/admin/catalog/${entity}` : `/api/admin/catalog/${entity}/${item.id}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item }) },
  );
}

export function deleteCatalogItem(entity: CatalogEntity, id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/catalog/${entity}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §12/§14 — Estoque: leitura de saldos + histórico e movimentação (§15/§14). */
export function fetchStock() {
  return adminFetch<{ products: AdminStockItem[]; movements: StockMovement[] }>(
    "/api/admin/stock",
  );
}

export function adjustStock(productId: string, input: StockAdjustInput) {
  return adminFetch<{ stock: number; reserved: number; minStock: number; movement: StockMovement }>(
    `/api/admin/stock/${encodeURIComponent(productId)}`,
    { method: "PUT", body: JSON.stringify({ input }) },
  );
}

/** §12 — Pedidos: mudança de status pelo painel (histórico preservado). */
export function updateOrderStatus(id: string, status: OrderStatus) {
  return adminFetch<{ ok: boolean; changed: boolean; status: OrderStatus }>(
    `/api/admin/orders/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify({ status }) },
  );
}

/** §12 — Clientes: leitura agregada dos pedidos (sem coleção própria). */
export function fetchCustomers() {
  return adminFetch<{ customers: AdminCustomer[] }>("/api/admin/customers");
}

/** §12/§15 — Pré-vendas (coleção `launches`). */
export function fetchLaunches() {
  return adminFetch<{ items: Launch[] }>("/api/admin/launches");
}

export function saveLaunch(launch: Launch, isNew: boolean) {
  return adminFetch<{ item: Launch }>(
    isNew ? "/api/admin/launches" : `/api/admin/launches/${encodeURIComponent(launch.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item: launch }) },
  );
}

export function deleteLaunch(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/launches/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §13 — papel e permissões da sessão corrente. */
export interface AdminMe {
  email: string;
  uid: string;
  role: AdminRole;
  roleLabel: string;
  permissions: AdminPermission[];
}

export function fetchMe() {
  return adminFetch<AdminMe>("/api/admin/me");
}

/** §13 — equipe administrativa (papéis). */
export function fetchAdmins() {
  return adminFetch<{ admins: AdminUser[]; superAdmin: string }>("/api/admin/users");
}

export function grantAdmin(input: { email: string; role: AdminRole; name?: string }) {
  return adminFetch<{ ok: boolean; admin: AdminUser }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdmin(email: string, patch: { role?: AdminRole; active?: boolean; name?: string }) {
  return adminFetch<{ ok: boolean; admin: AdminUser }>(
    `/api/admin/users/${encodeURIComponent(email)}`,
    { method: "PUT", body: JSON.stringify(patch) },
  );
}

export function removeAdmin(email: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/users/${encodeURIComponent(email)}`,
    { method: "DELETE" },
  );
}

/** §13 — registro/auditoria de alterações administrativas. */
export function fetchAudit(params?: { module?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.module) query.set("module", params.module);
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return adminFetch<{ entries: AuditLogEntry[] }>(`/api/admin/audit${suffix}`);
}

/** §12/§8 — grupo Digital: conteúdo dos produtos e licenças da biblioteca. */
export function fetchDigitalProducts(kind: DigitalModuleKind) {
  return adminFetch<{ items: Product[] }>(
    `/api/admin/digital/products?kind=${encodeURIComponent(kind)}`,
  );
}

export function saveDigitalProduct(
  productId: string,
  kind: DigitalModuleKind,
  input: DigitalFormState,
) {
  return adminFetch<{ ok: boolean; changed: boolean }>(
    `/api/admin/digital/products/${encodeURIComponent(productId)}`,
    { method: "PUT", body: JSON.stringify({ kind, input }) },
  );
}

export function fetchDigitalLibraries() {
  return adminFetch<{ libraries: AdminLibrary[]; products: Product[] }>(
    "/api/admin/digital/libraries",
  );
}

export function grantDigitalItem(uid: string, productId: string) {
  return adminFetch<{ ok: boolean; granted: boolean }>(
    `/api/admin/digital/libraries/${encodeURIComponent(uid)}`,
    { method: "POST", body: JSON.stringify({ productId }) },
  );
}

export function revokeDigitalItem(uid: string, productId: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/digital/libraries/${encodeURIComponent(uid)}`,
    { method: "DELETE", body: JSON.stringify({ productId }) },
  );
}

/** §12/§16 — Promoções (campanhas que combinam produtos, coleção, cupom e banner). */
export function fetchPromotions() {
  return adminFetch<{ items: Promotion[] }>("/api/admin/promotions");
}

export function savePromotion(promotion: Promotion, isNew: boolean) {
  return adminFetch<{ ok: boolean; changed?: boolean; item: Promotion }>(
    isNew ? "/api/admin/promotions" : `/api/admin/promotions/${encodeURIComponent(promotion.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item: promotion }) },
  );
}

export function deletePromotion(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/promotions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §12/§18 — Cliffhanger Club (membros/pontos e benefícios). */
export function fetchClub() {
  return adminFetch<{ members: ClubMember[]; benefits: ClubBenefit[] }>(
    "/api/admin/club/benefits",
  );
}

export function adjustClubPoints(uid: string, adjust: { delta: number; reason: string }) {
  return adminFetch<{ ok: boolean; member: ClubMember }>(
    `/api/admin/club/members/${encodeURIComponent(uid)}`,
    { method: "PUT", body: JSON.stringify({ adjust }) },
  );
}

export function saveBenefit(benefit: ClubBenefit, isNew: boolean) {
  return adminFetch<{ ok: boolean; item: ClubBenefit }>(
    isNew ? "/api/admin/club/benefits" : `/api/admin/club/benefits/${encodeURIComponent(benefit.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item: benefit }) },
  );
}

export function deleteBenefit(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/club/benefits/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §12/§19 — Avaliações (moderação; envio pelo cliente em POST /api/reviews). */
export function fetchReviews(status?: string) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return adminFetch<{ items: Review[] }>(`/api/admin/reviews${suffix}`);
}

export function moderateReview(id: string, status: Review["status"]) {
  return adminFetch<{ ok: boolean; changed: boolean; item: Review }>(
    `/api/admin/reviews/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify({ status }) },
  );
}

export function deleteReview(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/reviews/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §12/§16 — Notificações (rascunho → agendada → enviada). */
export function fetchNotifications() {
  return adminFetch<{ items: StoreNotification[] }>("/api/admin/notifications");
}

export function saveNotification(item: StoreNotification, isNew: boolean) {
  return adminFetch<{ ok: boolean; item: StoreNotification }>(
    isNew ? "/api/admin/notifications" : `/api/admin/notifications/${encodeURIComponent(item.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item }) },
  );
}

export function deleteNotification(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/notifications/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §12/§20 — Lançamentos (conteúdo editorial; mecânica em Pré-vendas). */
export function fetchLaunchContent() {
  return adminFetch<{ items: Launch[] }>("/api/admin/launch-content");
}

export function saveLaunchContent(id: string, content: LaunchContentForm) {
  return adminFetch<{ ok: boolean; changed: boolean }>(
    `/api/admin/launch-content/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify({ content }) },
  );
}

/** §12/§3 — Home (curadoria sobre o padrão ativo). */
export function fetchHomeOverride() {
  return adminFetch<{ override: HomeOverride | null }>("/api/admin/home");
}

export function saveHomeOverride(input: { destaques: string[]; sections: Array<{ key: string; enabled: boolean }> }) {
  return adminFetch<{ ok: boolean; override: HomeOverride }>(
    "/api/admin/home",
    { method: "PUT", body: JSON.stringify({ input }) },
  );
}

/** §12 — Notícias (vitrine pública em etapa futura). */
export function fetchNews() {
  return adminFetch<{ items: NewsItem[] }>("/api/admin/news");
}

export function saveNews(item: NewsItem, isNew: boolean) {
  return adminFetch<{ ok: boolean; changed?: boolean; item: NewsItem }>(
    isNew ? "/api/admin/news" : `/api/admin/news/${encodeURIComponent(item.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item }) },
  );
}

export function deleteNews(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/news/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §12 — Dados: Relatórios e Financeiro (somente leitura) e Configurações. */
export function fetchReport(days?: number) {
  const suffix = days ? `?days=${encodeURIComponent(days)}` : "";
  return adminFetch<{ report: ReportSummary }>(`/api/admin/reports${suffix}`);
}

export function fetchFinance(days?: number) {
  const suffix = days ? `?days=${encodeURIComponent(days)}` : "";
  return adminFetch<{ finance: FinanceSummary }>(`/api/admin/finance${suffix}`);
}

export function fetchSettings() {
  return adminFetch<{ settings: ShopSettings; defaults?: boolean }>("/api/admin/settings");
}

export function saveSettings(settings: ShopSettings) {
  return adminFetch<{ ok: boolean; settings: ShopSettings }>(
    "/api/admin/settings",
    { method: "PUT", body: JSON.stringify({ settings }) },
  );
}

/** §16/§24–§26 — Cliffhanger+ no painel: planos, Drops e Clube do Leitor. */
export interface PlusBoardResponse {
  plans: PlusPlan[];
  updatedAt?: string;
  stats: PlusStats;
}

export function fetchPlusBoard() {
  return adminFetch<PlusBoardResponse>("/api/admin/plus/plans");
}

export function savePlusPlans(plans: PlusPlan[]) {
  return adminFetch<{ ok: boolean; changed?: boolean; plans: PlusPlan[] }>(
    "/api/admin/plus/plans",
    { method: "PUT", body: JSON.stringify({ plans }) },
  );
}

export function fetchPlusDrops() {
  return adminFetch<{
    items: AdminDropRow[];
    claims: DropClaim[];
    options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] };
  }>("/api/admin/plus/drops");
}

export function saveDrop(drop: PlusDrop, isNew: boolean) {
  return adminFetch<{ ok: boolean; item: PlusDrop }>(
    isNew ? "/api/admin/plus/drops" : `/api/admin/plus/drops/${encodeURIComponent(drop.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item: drop }) },
  );
}

export function deleteDrop(id: string) {
  return adminFetch<{ ok: boolean; claimsRemoved?: number }>(
    `/api/admin/plus/drops/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function fetchPlusClub() {
  return adminFetch<{
    items: ClubBox[];
    options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] };
  }>("/api/admin/plus/club");
}

export function saveClubBox(box: ClubBox, isNew: boolean) {
  return adminFetch<{ ok: boolean; item: ClubBox }>(
    isNew ? "/api/admin/plus/club" : `/api/admin/plus/club/${encodeURIComponent(box.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item: box }) },
  );
}

export function deleteClubBox(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/plus/club/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** §16/§33 — Aplicativo (conteúdos específicos do app). */
export function fetchAppContent() {
  return adminFetch<{ content: AppContent }>("/api/admin/app");
}

export function saveAppContent(content: AppContent) {
  return adminFetch<{ ok: boolean; content: AppContent }>(
    "/api/admin/app",
    { method: "PUT", body: JSON.stringify({ content }) },
  );
}

/** §16/§34 — QR Codes (catálogo para alvo + códigos gerados). */
export interface QrListResponse {
  items: QrCodeEntry[];
  options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] };
}

export function fetchQrCodes() {
  return adminFetch<QrListResponse>("/api/admin/qrcodes");
}

export function saveQrCode(item: QrCodeEntry, isNew: boolean) {
  return adminFetch<{ ok: boolean; item: QrCodeEntry }>(
    isNew ? "/api/admin/qrcodes" : `/api/admin/qrcodes/${encodeURIComponent(item.id)}`,
    { method: isNew ? "POST" : "PUT", body: JSON.stringify({ item }) },
  );
}

export function deleteQrCode(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/qrcodes/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
