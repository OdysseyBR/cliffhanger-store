"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  claimLocalLibrary,
  fetchLibrary,
  localLibraryIds,
  readLocalProgress,
  saveProgress,
} from "@/lib/library-client";
import type { Bookmark, LibraryItem, Product, ReadingProgress } from "@/lib/types";

/**
 * Resolve o acesso a um item digital (§8 — controle de licença):
 * 1. conta logada → item na biblioteca da conta (Firestore);
 * 2. fallback → compra registrada neste dispositivo (localStorage);
 * 3. nenhum dos dois → `denied`.
 *
 * Também expõe o produto (sumário/arquivos) e `persist` para gravar
 * progresso/marcadores (nuvem quando há sessão + espelho local).
 */
export type DigitalItemStatus = "loading" | "denied" | "ready";

export function useDigitalItem(
  productId: string,
  kind: "ebook" | "audiobook",
) {
  const { user, authLoading } = useStore();
  const [status, setStatus] = useState<DigitalItemStatus>("loading");
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [synced, setSynced] = useState(false);
  const progressRef = useRef<ReadingProgress | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    void (async () => {
      let resolved: LibraryItem | null = null;
      let cloudProgress: ReadingProgress | null = null;

      // 1) compra na conta (+ sincroniza compras locais pendentes)
      if (user) {
        try {
          await claimLocalLibrary();
        } catch {
          /* melhor esforço */
        }
        const cloud = await fetchLibrary();
        if (cancelled) return;
        if (cloud) {
          resolved = cloud.items.find((i) => i.productId === productId) ?? null;
          cloudProgress = cloud.progress[productId] ?? null;
          if (resolved) setSynced(true);
        }
      }

      // 2) produto (capa, sumário, arquivos) — comum aos dois caminhos
      let prod: Product | null = null;
      try {
        const res = await fetch("/api/products");
        const data = (await res.json()) as { products?: Product[] };
        prod = data.products?.find((p) => p.id === productId) ?? null;
      } catch {
        prod = null;
      }
      if (cancelled) return;

      // 3) compra neste dispositivo (visitante ou nuvem indisponível)
      const localOwned = localLibraryIds().includes(productId);
      if (!resolved && localOwned) {
        resolved = {
          id: `item-${productId}`,
          productId,
          title: prod?.title ?? "Item digital",
          slug: prod?.slug,
          type: kind,
          files: (prod?.files ?? []).map((f) => ({ ...f })),
          purchasedAt: new Date().toISOString(),
        };
      }

      if (!resolved) {
        setProduct(prod);
        setStatus("denied");
        return;
      }

      const local = readLocalProgress(productId);
      const initial = cloudProgress ?? local;
      progressRef.current = initial;
      setItem(resolved);
      setProduct(prod);
      setProgress(initial);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, productId, kind]);

  /** Grava progresso/marcadores (conta + espelho local). */
  const persist = useCallback(
    (
      patch: {
        page?: number;
        pages?: number;
        position?: number;
        percent: number;
        bookmarks?: Bookmark[];
      },
      ) => {
      const base = progressRef.current;
      const next: ReadingProgress = {
        productId,
        kind,
        percent: Math.max(0, Math.min(100, Math.round(patch.percent))),
        page: patch.page ?? base?.page,
        pages: patch.pages ?? base?.pages,
        position: patch.position ?? base?.position,
        bookmarks: patch.bookmarks ?? base?.bookmarks ?? [],
        updatedAt: new Date().toISOString(),
      };
      progressRef.current = next;
      setProgress(next);
      void saveProgress(next).then((ok) => {
        if (ok) setSynced(true);
      });
    },
    [productId, kind],
  );

  return { status, item, product, progress, synced, persist };
}
