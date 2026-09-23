import { CatalogBrowser, PriceRange } from "@/components/CatalogBrowser";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import type { Product, ProductCategory } from "@/lib/types";

/** Casca visual compartilhada pelas páginas de categoria. */
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
  return (
    <Page>
      <Section title={title} subtitle={intro}>
        <div className="mb-6">
          <PriceRange products={products} />
        </div>
        <CatalogBrowser
          products={products}
          showCategories={false}
          fixedCategory={category}
          emptyMessage={`Ainda não há ${title.toLowerCase()} disponíveis.`}
        />
      </Section>
    </Page>
  );
}
