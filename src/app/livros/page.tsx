import type { Metadata } from "next";
import { CategoryPageView } from "@/components/CategoryPageView";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Livros",
  description:
    "Livros físicos da Cliffhanger Store: capa dura, edições especiais, boxes e pré-vendas.",
};

export default async function LivrosPage() {
  const { products } = await getCatalog();
  return (
    <CategoryPageView
      title="Livros"
      intro="Edições físicas, capas duras, edições especiais e pré-vendas dos universos Cliffhanger."
      category="livros"
      products={products.filter((p) => p.category === "livros")}
    />
  );
}
