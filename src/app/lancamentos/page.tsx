import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getCatalog, launches } from "@/lib/data";

export const metadata: Metadata = {
  title: "Lançamentos",
  description: "Lançamentos, novidades e pré-vendas da Cliffhanger Store.",
};

export default async function LancamentosPage() {
  const { products } = await getCatalog();
  const list = launches(products);

  return (
    <Page>
      <Section
        title="Lançamentos"
        subtitle="Novidades, chegadas recentes e pré-vendas com data de envio prevista."
      >
        {list.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-display text-3xl">Sem lançamentos no momento</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Volte em breve — a próxima leva já está a caminho.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
