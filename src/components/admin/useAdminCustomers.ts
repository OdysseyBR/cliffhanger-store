"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { fetchCustomers } from "@/components/admin/admin-api";
import type { AdminCustomer } from "@/lib/types";

interface Loaded {
  uid: string;
  customers: AdminCustomer[];
}

interface Failed {
  uid: string;
  message: string;
}

export interface AdminCustomers {
  customers: AdminCustomer[] | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * §12 — módulo Clientes: leitura agregada dos pedidos (sem coleção própria
 * e sem escrita — a matriz §13 não tem `customers.edit`).
 */
export function useAdminCustomers(): AdminCustomers {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchCustomers();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, customers: result.data.customers ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao carregar os clientes.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    customers: current?.customers ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    reload: () => setReloadKey((key) => key + 1),
  };
}
