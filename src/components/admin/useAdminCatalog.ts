"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  deleteCatalogItem,
  fetchCatalogItems,
  saveCatalogItem,
  type AdminCatalogItem,
  type AdminResult,
} from "@/components/admin/admin-api";
import type { CatalogEntity } from "@/lib/catalog-fields";

interface Loaded<T> {
  uid: string;
  items: T[];
}

interface Failed {
  uid: string;
  message: string;
}

export interface AdminCatalog<T extends AdminCatalogItem> {
  items: T[] | null;
  error: string | null;
  loading: boolean;
  /** verdadeiro enquanto grava/exclui (desabilita os botões) */
  busy: boolean;
  reload: () => void;
  /** cria (isNew) ou atualiza — recarrega a lista em caso de sucesso */
  save: (item: T, isNew: boolean) => Promise<AdminResult<{ item: T }>>;
  /** exclui — recarrega a lista em caso de sucesso */
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

/**
 * Lista e CRUD de um módulo do grupo Catálogo (§12): Obras, Universos,
 * Autores, Categorias ou Coleções. Cada módulo fala com a própria
 * coleção via `/api/admin/catalog/[entity]`.
 *
 * Resultado "taggeado" com o uid — logout/login não mostra dados de outra
 * sessão (mesmo padrão das demais listas do painel).
 */
export function useAdminCatalog<T extends AdminCatalogItem>(
  entity: CatalogEntity,
): AdminCatalog<T> {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchCatalogItems<T>(entity);
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
          message: error instanceof Error ? error.message : "Falha ao carregar o módulo.",
        });
      }
    })();
  }, [uid, entity, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(
    async (item: T, isNew: boolean) => {
      setBusy(true);
      const result = await saveCatalogItem(entity, item, isNew);
      setBusy(false);
      if (result.ok) setReloadKey((key) => key + 1);
      return result;
    },
    [entity],
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      const result = await deleteCatalogItem(entity, id);
      setBusy(false);
      if (result.ok) setReloadKey((key) => key + 1);
      return result;
    },
    [entity],
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
    remove,
  };
}
