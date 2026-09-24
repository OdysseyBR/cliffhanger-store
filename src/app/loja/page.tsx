import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getCatalog } from "@/lib/data";
import { buildFilterMaps } from "@/lib/filters";

export const metadata: Metadata = {
  title: "Loja",
  description:
    "Todos os produtos da Cliffhanger Store: livros, e-books, audiobooks, produtos oficiais e colecionáveis.",
};

export default async function LojaPage() {
  const catalog = await getCatalog();
  const { products } = catalog;

  return (
    <Page>
      <Section
        title="Loja"
        subtitle="Catálogo completo — filtre por categoria, preço, disponibilidade e avaliação."
      >
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]" />
          }
        >
          <CatalogBrowser products={products} filterMaps={buildFilterMaps(catalog)} />
        </Suspense>
      </Section>
    </Page>
  );
}
