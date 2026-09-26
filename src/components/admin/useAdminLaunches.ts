"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  deleteLaunch,
  fetchLaunches,
  saveLaunch,
  type AdminResult,
} from "@/components/admin/admin-api";
import type { Launch } from "@/lib/types";

interface Loaded {
  uid: string;
  items: Launch[];
}

interface Failed {
  uid: string;
  message: string;
}

export interface AdminLaunches {
  items: Launch[] | null;
  error: string | null;
  loading: boolean;
  /** verdadeiro enquanto grava/exclui (desabilita os botões) */
  busy: boolean;
  reload: () => void;
  /** cria (isNew) ou atualiza — recarrega a lista em caso de sucesso */
  save: (launch: Launch, isNew: boolean) => Promise<AdminResult<{ item: Launch }>>;
  /** exclui — recarrega a lista em caso de sucesso */
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

/**
 * §15 — lista e CRUD das pré-vendas do painel (§12), ligada à coleção
 * `launches` por `/api/admin/launches`. Resultado "taggeado" com o uid.
 */
export function useAdminLaunches(): AdminLaunches {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchLaunches();
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
          message: error instanceof Error ? error.message : "Falha ao carregar as pré-vendas.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (launch: Launch, isNew: boolean) => {
    setBusy(true);
    const result = await saveLaunch(launch, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteLaunch(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

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
