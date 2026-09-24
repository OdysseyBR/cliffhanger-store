"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  fetchThemes,
  type AdminFailure,
} from "@/components/admin/admin-api";
import type { ThemeModel } from "@/lib/types";

interface Loaded {
  uid: string;
  themes: ThemeModel[];
  email?: string;
}

interface Failed {
  uid: string;
  failure: AdminFailure;
  message: string;
}

/**
 * Carrega os modelos do Theme Engine para o usuário logado.
 * Resultados ficam "taggeados" com o uid — logout/login não mostra
 * dados de outra sessão (sem setState síncrono em efeito).
 */
export function useAdminThemes(): {
  themes: ThemeModel[] | null;
  email: string | null;
  error: { failure: AdminFailure; message: string } | null;
  loading: boolean;
  reload: () => void;
} {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      const result = await fetchThemes();
      if (result.ok) {
        setFailed(null);
        setLoaded({ uid, themes: result.data.themes, email: result.data.email });
      } else {
        setLoaded(null);
        setFailed({ uid, failure: result.failure, message: result.message });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    themes: current?.themes ?? null,
    email: current?.email ?? null,
    error: currentError
      ? { failure: currentError.failure, message: currentError.message }
      : null,
    loading: authLoading || Boolean(uid && !current && !currentError),
    reload,
  };
}
