"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import type { LibraryItem } from "@/lib/types";

/** §13 — resumo da biblioteca: a experiência completa continua em /biblioteca. */
export default function ContaBibliotecaPage() {
  const { user } = useStore();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const res = await fetch("/api/library", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: LibraryItem[] };
          setItems(data.items ?? []);
        }
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return <h1 className="sr-only">Biblioteca</h1>;

  const ebooks = items.filter((item) => item.type === "ebook").length;
  const audiobooks = items.filter((item) => item.type === "audiobook").length;

  return (
    <div className="card space-y-3 p-5">
      <h1 className="text-display text-2xl text-gold">Biblioteca</h1>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando resumo…</p>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          {ebooks} ebooks · {audiobooks} audiobooks
        </p>
      )}
      <div>
        <Link href="/biblioteca" className="btn btn-primary px-4 py-2 text-xs">
          Abrir biblioteca
        </Link>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Leitura, reprodução e gerenciamento do conteúdo digital continuam na biblioteca completa.
      </p>
    </div>
  );
}
