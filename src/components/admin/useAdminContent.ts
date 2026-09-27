"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  deleteNews,
  fetchHomeOverride,
  fetchLaunchContent,
  fetchNews,
  saveHomeOverride,
  saveLaunchContent,
  saveNews,
  type AdminResult,
} from "@/components/admin/admin-api";
import type { LaunchContentForm } from "@/lib/content-fields";
import type { HomeOverride, Launch, NewsItem } from "@/lib/types";

/**
 * §12 — hooks do grupo Conteúdo (Lançamentos §20, Home §3 e Notícias):
 * leitura e gravação por `/api/admin/*`, resultado "taggeado" com o uid,
 * igual aos demais hooks do painel.
 */

interface Failed {
  uid: string;
  message: string;
}

function loadError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// Lançamentos — conteúdo editorial (§20)
// ---------------------------------------------------------------------------

export interface AdminLaunchContent {
  items: Launch[] | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (id: string, content: LaunchContentForm) => Promise<AdminResult<{ ok: boolean; changed: boolean }>>;
}

export function useAdminLaunchContent(): AdminLaunchContent {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; items: Launch[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchLaunchContent();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, items: result.data.items ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar os lançamentos.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (id: string, content: LaunchContentForm) => {
    setBusy(true);
    const result = await saveLaunchContent(id, content);
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
  };
}

// ---------------------------------------------------------------------------
// Home — curadoria (§3)
// ---------------------------------------------------------------------------

export interface AdminHome {
  override: HomeOverride | null | undefined;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (input: { destaques: string[]; sections: Array<{ key: string; enabled: boolean }> }) => Promise<AdminResult<{ ok: boolean; override: HomeOverride }>>;
}

export function useAdminHome(): AdminHome {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; override: HomeOverride | null } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchHomeOverride();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, override: result.data.override ?? null });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar a home.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(
    async (input: { destaques: string[]; sections: Array<{ key: string; enabled: boolean }> }) => {
      setBusy(true);
      const result = await saveHomeOverride(input);
      setBusy(false);
      if (result.ok) setReloadKey((key) => key + 1);
      return result;
    },
    [],
  );

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    override: current?.override,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
  };
}

// ---------------------------------------------------------------------------
// Notícias
// ---------------------------------------------------------------------------

export interface AdminNews {
  items: NewsItem[] | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (item: NewsItem, isNew: boolean) => Promise<AdminResult<{ ok: boolean; changed?: boolean; item: NewsItem }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminNews(): AdminNews {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; items: NewsItem[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchNews();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, items: result.data.items ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar as notícias.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (item: NewsItem, isNew: boolean) => {
    setBusy(true);
    const result = await saveNews(item, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteNews(id);
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
