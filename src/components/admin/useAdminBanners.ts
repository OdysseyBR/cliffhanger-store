"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { fetchBanners } from "@/components/admin/admin-api";
import type { Banner } from "@/lib/types";

interface Failed {
  uid: string;
  message: string;
}

/**
 * Carrega a lista de banners do módulo Banners (§5). Resultado "taggeado"
 * com o uid — logout/login não mostra dados de outra sessão (mesmo padrão
 * das demais listas do painel).
 */
export function useAdminBanners(): {
  banners: Banner[] | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; banners: Banner[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchBanners();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, banners: result.data.banners ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao carregar os banners.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    banners: current?.banners ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    reload,
  };
}
