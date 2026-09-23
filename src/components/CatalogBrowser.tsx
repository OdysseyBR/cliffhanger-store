"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { categoryLabels } from "@/data/catalog";
import { formatPrice } from "@/lib/format";
import type { Product, ProductCategory } from "@/lib/types";

type SortKey = "relevancia" | "menor" | "maior" | "avaliacao" | "novidades";

const sortLabels: Record<SortKey, string> = {
  relevancia: "Relevância",
  menor: "Menor preço",
  maior: "Maior preço",
  avaliacao: "Melhor avaliação",
  novidades: "Novidades",
};

/**
 * Navegador de catálogo: busca, filtros e ordenação no cliente
 * (Documento Mestre 6.3 — filtros de categoria, tipo, preço, etc.).
 */
export function CatalogBrowser({
  products,
  showCategories = true,
  fixedCategory,
  emptyMessage = "Nenhum produto encontrado com esses filtros.",
}: {
  products: Product[];
  showCategories?: boolean;
  fixedCategory?: ProductCategory;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "todos">(
    fixedCategory ?? "todos",
  );
  const [sort, setSort] = useState<SortKey>("relevancia");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [inStock, setInStock] = useState(false);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return (Object.keys(categoryLabels) as ProductCategory[]).filter((c) => present.has(c));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      if (fixedCategory && p.category !== fixedCategory) return false;
      if (category !== "todos" && p.category !== category) return false;
      if (onlyOffers && !(p.compareAt && p.compareAt > p.price)) return false;
      if (inStock && p.stock === 0 && !p.digital) return false;
      if (q && !`${p.title} ${p.description} ${p.type}`.toLowerCase().includes(q)) return false;
      return true;
    });

    list = [...list];
    switch (sort) {
      case "menor":
        list.sort((a, b) => a.price - b.price);
        break;
      case "maior":
        list.sort((a, b) => b.price - a.price);
        break;
      case "avaliacao":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "novidades":
        list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        break;
      default:
        list.sort((a, b) => (a.salesRank ?? 99) - (b.salesRank ?? 99));
    }
    return list;
  }, [products, query, category, sort, onlyOffers, inStock, fixedCategory]);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      {/* filtros */}
      <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
        <div>
          <label htmlFor="catalog-search" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gold">
            Buscar
          </label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: valeharts, caneca…"
            className="field"
          />
        </div>

        {showCategories && !fixedCategory && categories.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Categoria</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("todos")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  category === "todos"
                    ? "border-transparent bg-violet text-paper"
                    : "border-[var(--border)] hover:border-violet-soft"
                }`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    category === c
                      ? "border-transparent bg-violet text-paper"
                      : "border-[var(--border)] hover:border-violet-soft"
                  }`}
                >
                  {categoryLabels[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Status</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyOffers}
              onChange={(e) => setOnlyOffers(e.target.checked)}
              className="h-4 w-4 accent-[#5603AD]"
            />
            Somente ofertas
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-4 w-4 accent-[#5603AD]"
            />
            Pronta entrega
          </label>
        </div>

        <div>
          <label htmlFor="catalog-sort" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gold">
            Ordenar por
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="field"
          >
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
          <strong className="text-gold">{filtered.length}</strong> produto
          {filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}.
        </div>
      </aside>

      {/* resultados */}
      <div>
        {filtered.length === 0 ? (
          <div className="card grid place-items-center gap-3 p-12 text-center">
            <p className="text-display text-3xl">Nada por aqui</p>
            <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
            <Link href="/loja" className="btn btn-primary">
              Ver toda a loja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Resumo de preço para páginas de categoria. */
export function PriceRange({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  const prices = products.map((p) => p.price);
  return (
    <p className="text-sm text-[var(--text-muted)]">
      De <strong className="text-gold">{formatPrice(Math.min(...prices))}</strong> a{" "}
      <strong className="text-gold">{formatPrice(Math.max(...prices))}</strong>
    </p>
  );
}
