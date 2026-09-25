"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import type { Product, Universe, Work, Author } from "@/lib/types";

interface Loaded {
  uid: string;
  products: Product[];
  works: Work[];
  universes: Universe[];
  authors: Author[];
}

interface Failed {
  uid: string;
  message: string;
}

/**
 * Carrega o catálogo para o criador de itens do painel (listagem e
 * selects de obra/universo/autor). Leitura pública de /api/products —
 * as ESCritas passam pela API guardada por super admin (admin-api).
 * Resultados ficam "taggeados" com o uid — logout/login não mostra
 * dados de outra sessão (mesmo padrão das demais listas do painel).
 */
export function useAdminProducts(): {
  products: Product[] | null;
  works: Work[];
  universes: Universe[];
  authors: Author[];
  error: string | null;
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
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = (await res.json()) as {
          products?: Product[];
          works?: Work[];
          universes?: Universe[];
          authors?: Author[];
        };
        setFailed(null);
        setLoaded({
          uid,
          products: data.products ?? [],
          works: data.works ?? [],
          universes: data.universes ?? [],
          authors: data.authors ?? [],
        });
      } catch (error) {
        setLoaded(null);
        setFailed({
          uid,
          message: error instanceof Error ? error.message : "Falha ao carregar o catálogo.",
        });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    products: current?.products ?? null,
    works: current?.works ?? [],
    universes: current?.universes ?? [],
    authors: current?.authors ?? [],
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    reload,
  };
}
