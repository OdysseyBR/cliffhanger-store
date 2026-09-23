import type { Metadata } from "next";
import { CategoryPageView } from "@/components/CategoryPageView";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Audiobooks",
  description: "Audiobooks oficiais com narração completa e retomada automática.",
};

export default async function AudiobooksPage() {
  const { products } = await getCatalog();
  return (
    <CategoryPageView
      title="Audiobooks"
      intro="Narração completa, trilha sonora e retomada do ponto anterior em qualquer dispositivo."
      category="audiobooks"
      products={products.filter((p) => p.category === "audiobooks")}
    />
  );
}
