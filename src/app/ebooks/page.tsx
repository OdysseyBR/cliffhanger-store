import type { Metadata } from "next";
import { CategoryPageView } from "@/components/CategoryPageView";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "E-books",
  description: "E-books oficiais com sincronização entre dispositivos e acesso imediato.",
};

export default async function EbooksPage() {
  const { products } = await getCatalog();
  return (
    <CategoryPageView
      title="E-books"
      intro="Formato digital com sincronização de leitura, marcadores e tema claro/escuro. Acesso imediato na Biblioteca."
      category="ebooks"
      products={products.filter((p) => p.category === "ebooks")}
    />
  );
}
