"use client";

import { getClientAuth, firebaseEnabled } from "@/lib/firebase";
import type { Order, Product } from "@/lib/types";

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
      message: "Esta conta não é o super admin autorizado para o painel.",
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
