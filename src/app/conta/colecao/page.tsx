"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import type { CollectionEntry } from "@/lib/account-fields";

/**
 * §14 — Minha Coleção ("eu tenho"): físicos e digitais comprados,
 * agrupados por universo. Entra sozinha a cada compra — wishlist é o
 * "quero ter".
 */

export default function ContaColecaoPage() {
  const { user } = useStore();
  const [items, setItems] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const res = await fetch("/api/account/collection", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: CollectionEntry[] };
          setItems(data.items ?? []);
        }
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return <h1 className="sr-only">Minha coleção</h1>;

  const groups = new Map<string, CollectionEntry[]>();
  for (const item of items) {
    const key = item.universeName ?? "Sem universo";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display text-2xl text-gold">Minha coleção</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Tudo que você tem — {items.length} item(ns). O que você quer ter fica na{" "}
          <a href="/conta/wishlist" className="text-gold underline">
            wishlist
          </a>
          .
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Montando sua coleção…</p>}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-display text-2xl">Coleção vazia — por enquanto</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Cada compra entra aqui sozinha: físicos, e-books, audiobooks e colecionáveis.
          </p>
        </div>
      )}

      {[...groups.entries()].map(([universe, list]) => (
        <div key={universe} className="card space-y-2 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {universe} ({list.length})
          </p>
          {list.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold">{item.title}</span>
              <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {item.digital ? (item.kind === "audiobook" ? "audiobook" : "e-book") : "físico"}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
