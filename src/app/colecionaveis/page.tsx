import type { Metadata } from "next";
import { CategoryPageView } from "@/components/CategoryPageView";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Colecionáveis",
  description: "Boxes, moedas, mini-estátuas e edições limitadas para colecionadores.",
};

export default async function ColecionaveisPage() {
  const { products } = await getCatalog();
  return (
    <CategoryPageView
      title="Colecionáveis"
      intro="Boxes rígidos, itens numerados, moedas e mini-estátuas — tiragens limitadas."
      category="colecionaveis"
      products={products.filter((p) => p.category === "colecionaveis")}
    />
  );
}
