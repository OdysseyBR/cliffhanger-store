import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Loja",
  description:
    "Todos os produtos da Cliffhanger Store: livros, e-books, audiobooks, produtos oficiais e colecionáveis.",
};

export default async function LojaPage() {
  const { products } = await getCatalog();

  return (
    <Page>
      <Section
        title="Loja"
        subtitle="Catálogo completo — filtre por categoria, preço, disponibilidade e avaliação."
      >
        <CatalogBrowser products={products} />
      </Section>
    </Page>
  );
}
