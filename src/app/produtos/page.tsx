import type { Metadata } from "next";
import { CategoryPageView } from "@/components/CategoryPageView";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Produtos",
  description:
    "Produtos oficiais Cliffhanger: camisetas, canecas, posters, marcadores e adesivos.",
};

export default async function ProdutosPage() {
  const { products } = await getCatalog();
  return (
    <CategoryPageView
      title="Produtos"
      intro="Camisetas, canecas, posters, marcadores e adesivos com as artes dos universos."
      category="produtos"
      products={products.filter((p) => p.category === "produtos")}
    />
  );
}
