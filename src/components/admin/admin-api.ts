"use client";

import { getClientAuth, firebaseEnabled } from "@/lib/firebase";
import type { AdminPermission, AdminRole } from "@/lib/roles";
import type { CatalogEntity } from "@/lib/catalog-fields";
import type {
  AdminUser,
  AuditLogEntry,
  Author,
  Banner,
  Category,
  Collection,
  Coupon,
  Order,
  Product,
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
