"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { ProductArt } from "@/components/ProductArt";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

const LIBRARY_KEY = "ch:library";

/**
 * Biblioteca digital (Fase 3 — leitor/player ficam para a fase seguinte):
 * lista e-books e audiobooks comprados, com estado vazio explicativo.
 */
export default function BibliotecaPage() {
  const { user } = useStore();
  const [owned, setOwned] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/products");
        const data = (await res.json()) as { products: Product[] };
        setProducts(data.products ?? []);
      } catch {
        setProducts([]);
      }
      try {
        const raw = window.localStorage.getItem(LIBRARY_KEY);
        setOwned(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        setOwned([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = products.filter((p) => owned.includes(p.id));
  const suggestions = products.filter((p) => p.digital && !owned.includes(p.id)).slice(0, 4);

  return (
    <Page>
      <Section
        title="Biblioteca"
        subtitle={
          user
            ? "Seus e-books e audiobooks, disponíveis em qualquer dispositivo."
            : "Seus itens digitais neste dispositivo. Entre na conta para sincronizar a biblioteca."
        }
        href="/ebooks"
        hrefLabel="Ver e-books"
      >
        {loading ? (
          <div className="card grid place-items-center p-12 text-[var(--text-muted)]">
            Carregando biblioteca…
          </div>
        ) : items.length === 0 ? (
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <p className="text-display text-4xl">Nenhum item ainda</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Compre um e-book ou audiobook e ele aparece aqui automaticamente após a confirmação
              do pagamento — sem esperar entrega.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ebooks" className="btn btn-primary">
                Explorar e-books
              </Link>
              <Link href="/audiobooks" className="btn btn-ghost">
                Explorar audiobooks
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <li key={product.id} className="card flex gap-4 p-4">
                <span className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                  <ProductArt product={product} />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold">
                    {product.type === "audiobook" ? "Audiobook" : "E-book"}
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm font-bold">{product.title}</p>
                  <div className="mt-auto flex gap-2 pt-2">
                    <button type="button" className="btn btn-primary px-3 py-2 text-[11px]">
                      {product.type === "audiobook" ? "Ouvir" : "Ler"}
                    </button>
                    <button type="button" className="btn btn-ghost px-3 py-2 text-[11px]">
                      Download
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && suggestions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-display mb-4 text-2xl">Continue a coleção</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suggestions.map((product) => (
                <li key={product.id} className="card flex items-center gap-3 p-3">
                  <span className="h-16 w-11 shrink-0 overflow-hidden rounded border border-[var(--border)]">
                    <ProductArt product={product} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold">{product.title}</p>
                    <p className="text-xs text-gold">{formatPrice(product.price)}</p>
                  </div>
                  <Link
                    href={`/produtos/${product.slug}`}
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                  >
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </Page>
  );
}
