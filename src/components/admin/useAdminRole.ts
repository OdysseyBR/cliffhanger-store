"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { fetchMe, type AdminMe } from "@/components/admin/admin-api";
import type { AdminPermission } from "@/lib/roles";

interface Failed {
  uid: string;
  message: string;
}

/**
 * §13 — papel e permissões da sessão corrente no painel.
 * Resultado "taggeado" com o uid (mesmo padrão das demais listas do
 * admin): trocar de conta nunca reaproveita a matriz da sessão anterior.
 */
export function useAdminRole(): {
  me: AdminMe | null;
  loading: boolean;
  error: string | null;
  can: (permission: AdminPermission) => boolean;
  reload: () => void;
} {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; me: AdminMe } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchMe();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, me: result.data });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao ler as permissões.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  const me = current?.me ?? null;
  const permissions = me?.permissions ?? [];

  return {
    me,
    loading: !authLoading && uid !== null && !current && !currentError,
    error: currentError?.message ?? null,
    can: (permission: AdminPermission) => permissions.includes(permission),
    reload,
  };
}
