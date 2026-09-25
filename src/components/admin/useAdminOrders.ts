"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  fetchOrders,
  type AdminFailure,
} from "@/components/admin/admin-api";
import type { Order } from "@/lib/types";

interface Loaded {
  uid: string;
  orders: Order[];
}

interface Failed {
  uid: string;
  failure: AdminFailure;
  message: string;
}

/**
 * Carrega os pedidos para o Dashboard do painel (Doc Mestre 11.1).
 * Leitura guardada por super admin — contas sem permissão recebem o
 * erro amigável em vez de dados. Mesmo padrão de tag por uid dos
 * demais hooks do admin (logout/login não vaza dados de outra sessão).
 */
export function useAdminOrders(): {
  orders: Order[] | null;
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
      const result = await fetchOrders();
      if (result.ok) {
        setFailed(null);
        setLoaded({ uid, orders: result.data.orders });
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
    orders: current?.orders ?? null,
    error: currentError
      ? { failure: currentError.failure, message: currentError.message }
      : null,
    loading: authLoading || Boolean(uid && !current && !currentError),
    reload,
  };
}
