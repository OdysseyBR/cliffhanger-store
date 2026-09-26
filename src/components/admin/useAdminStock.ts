"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { adjustStock, fetchStock, type AdminResult } from "@/components/admin/admin-api";
import type { AdminStockItem, StockAdjustInput } from "@/lib/stock-fields";
import type { StockMovement } from "@/lib/types";

interface Loaded {
  uid: string;
  products: AdminStockItem[];
  movements: StockMovement[];
}

interface Failed {
  uid: string;
  message: string;
}

export interface AdminStock {
  products: AdminStockItem[] | null;
  movements: StockMovement[] | null;
  error: string | null;
  loading: boolean;
  /** verdadeiro enquanto grava (desabilita os botões) */
  busy: boolean;
  reload: () => void;
  /** movimenta o estoque do produto (entrada, saída ou ajuste) */
  adjust: (
    productId: string,
    input: StockAdjustInput,
  ) => Promise<AdminResult<{ stock: number; reserved: number; minStock: number; movement: StockMovement }>>;
}

/**
 * §14 — saldos de estoque (atual, reservado, disponível, mínimo) e histórico
 * de movimentações do módulo Estoque (§12). Resultado "taggeado" com o uid:
 * logout/login não mostra dados de outra sessão.
 */
export function useAdminStock(): AdminStock {
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
        const result = await fetchStock();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({
          uid,
          products: result.data.products ?? [],
          movements: result.data.movements ?? [],
        });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao carregar o estoque.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const adjust = useCallback(async (productId: string, input: StockAdjustInput) => {
    setBusy(true);
    const result = await adjustStock(productId, input);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    products: current?.products ?? null,
    movements: current?.movements ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    adjust,
  };
}
