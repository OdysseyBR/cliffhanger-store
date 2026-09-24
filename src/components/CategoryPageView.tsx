import { Suspense } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import {
  IconBook,
  IconDice,
  IconHeadphones,
  IconShirt,
  IconTag,
  IconTablet,
} from "@/components/Icons";
import { Page } from "@/components/Page";
import { formatPrice } from "@/lib/format";
import type { Product, ProductCategory } from "@/lib/types";

function categoryIcon(category: ProductCategory) {
  switch (category) {
    case "livros":
      return <IconBook className="h-full w-full" />;
    case "ebooks":
      return <IconTablet className="h-full w-full" />;
    case "audiobooks":
      return <IconHeadphones className="h-full w-full" />;
    case "produtos":
      return <IconShirt className="h-full w-full" />;
    case "colecionaveis":
      return <IconDice className="h-full w-full" />;
    default:
      return <IconTag className="h-full w-full" />;
  }
}

/**
 * Casca visual compartilhada pelas páginas de categoria.
 * Hero com identidade própria (ícone, intro e chips de itens/preço)
 * seguido dos filtros e grade do catálogo.
 */
export function CategoryPageView({
  title,
  intro,
  category,
  products,
}: {
  title: string;
  intro: string;
  category: ProductCategory;
  products: Product[];
}) {
  const count = products.length;
  const min = count > 0 ? Math.min(...products.map((p) => p.price)) : 0;
  const max = count > 0 ? Math.max(...products.map((p) => p.price)) : 0;

  return (
    <Page>
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {/* hero da categoria */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-violet/25 via-[var(--surface-raised)] to-[var(--surface)] p-6 sm:p-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-violet/15 sm:h-56 sm:w-56"
          >
            {categoryIcon(category)}
          </span>

          <div className="relative flex flex-col gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold">
              {categoryIcon(category)}
            </span>

            <div>
              <h1 className="text-display text-4xl sm:text-5xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">{intro}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)]/80 px-3 py-1.5 font-semibold">
                <strong className="text-gold">{count}</strong> {count === 1 ? "item" : "itens"}
              </span>
              {count > 0 && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)]/80 px-3 py-1.5 font-semibold text-[var(--text-muted)]">
                  De <strong className="text-gold">{formatPrice(min)}</strong> a{" "}
                  <strong className="text-gold">{formatPrice(max)}</strong>
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="py-8">
          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]" />
            }
          >
            <CatalogBrowser
              products={products}
              showCategories={false}
              fixedCategory={category}
              emptyMessage={`Ainda não há ${title.toLowerCase()} disponíveis.`}
            />
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
