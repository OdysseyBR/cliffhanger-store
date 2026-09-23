import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getCatalog, offers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Ofertas e promoções por tempo limitado na Cliffhanger Store.",
};

export default async function OfertasPage() {
  const { products } = await getCatalog();
  const list = offers(products);

  const biggest = list.reduce((max, p) => {
    const off = p.compareAt ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
    return Math.max(max, off);
  }, 0);

  return (
    <Page>
      <Section title="Ofertas" subtitle="Descontos por tempo limitado em produtos selecionados.">
        {biggest > 0 && (
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-gold px-5 py-2 text-ink">
            <span className="text-display text-2xl">Até {biggest}% OFF</span>
            <span className="text-xs font-bold uppercase tracking-wider">Cliffhanger Winter Fest</span>
          </div>
        )}

        {list.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-display text-3xl">Nenhuma oferta ativa</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              A próxima campanha já está sendo montada — fique de olho.
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
