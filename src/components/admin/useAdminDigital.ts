"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  fetchDigitalLibraries,
  fetchDigitalProducts,
  grantDigitalItem,
  revokeDigitalItem,
  saveDigitalProduct,
  type AdminResult,
} from "@/components/admin/admin-api";
import type { DigitalFormState, DigitalModuleKind } from "@/lib/digital-fields";
import type { AdminLibrary, Product } from "@/lib/types";

interface Failed {
  uid: string;
  message: string;
}

interface LoadedProducts {
  uid: string;
  items: Product[];
}

interface LoadedLibraries {
  uid: string;
  libraries: AdminLibrary[];
  products: Product[];
}

export interface AdminDigitalProducts {
  items: Product[] | null;
  error: string | null;
  loading: boolean;
  /** verdadeiro enquanto grava (desabilita os botões) */
  busy: boolean;
  reload: () => void;
  /** grava arquivos/sumário/entrega digital e recarrega a lista */
  save: (
    productId: string,
    input: DigitalFormState,
  ) => Promise<AdminResult<{ ok: boolean; changed: boolean }>>;
}

/**
 * §12/§8 — lista e edição do conteúdo digital de um módulo: `kind="pdf"`
 * alimenta E-books e `kind="audio"` alimenta Audiobooks (coleção
 * `products` por `/api/admin/digital/products`). Resultado "taggeado"
 * com o uid, igual aos demais hooks do painel.
 */
export function useAdminDigitalProducts(kind: DigitalModuleKind): AdminDigitalProducts {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<LoadedProducts | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchDigitalProducts(kind);
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, items: result.data.items ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao carregar os produtos digitais.",
        });
      }
    })();
  }, [uid, kind, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(
    async (productId: string, input: DigitalFormState) => {
      setBusy(true);
      const result = await saveDigitalProduct(productId, kind, input);
      setBusy(false);
      if (result.ok) setReloadKey((key) => key + 1);
      return result;
    },
    [kind],
  );

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    items: current?.items ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
  };
}

export interface AdminLibraries {
  libraries: AdminLibrary[] | null;
  /** catálogo digital (e-books + audiobooks) para conceder acesso */
  products: Product[] | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  /** concede um produto à biblioteca do cliente (§8) */
  grant: (uid: string, productId: string) => Promise<AdminResult<{ ok: boolean; granted: boolean }>>;
  /** revoga um item da biblioteca do cliente (§8) */
  revoke: (uid: string, productId: string) => Promise<AdminResult<{ ok: boolean }>>;
}

/** §12/§8 — licenças da Biblioteca Digital por `/api/admin/digital/libraries`. */
export function useAdminLibraries(): AdminLibraries {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<LoadedLibraries | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchDigitalLibraries();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({
          uid,
          libraries: result.data.libraries ?? [],
          products: result.data.products ?? [],
        });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao carregar as bibliotecas.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const grant = useCallback(async (target: string, productId: string) => {
    setBusy(true);
    const result = await grantDigitalItem(target, productId);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const revoke = useCallback(async (target: string, productId: string) => {
    setBusy(true);
    const result = await revokeDigitalItem(target, productId);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    libraries: current?.libraries ?? null,
    products: current?.products ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    grant,
    revoke,
  };
}
