import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { IconArrowRight, IconClock } from "@/components/Icons";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { getCatalog, launches } from "@/lib/data";

export const metadata: Metadata = {
  title: "Lançamentos",
  description: "Lançamentos, novidades e pré-vendas da Cliffhanger Store.",
};

export default async function LancamentosPage() {
  const { products, launches: launchList } = await getCatalog();
  const list = launches(products);

  return (
    <Page>
      {launchList.length > 0 && (
        <Section
          title="Páginas de lançamento"
          subtitle="Data, contagem regressiva, edições, trailer e produtos derivados (Documento Mestre 13.1)."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {launchList.map((launch) => (
              <Link
                key={launch.id}
                href={`/lancamentos/${launch.slug}`}
                className="card group flex gap-4 p-4 transition hover:-translate-y-1"
              >
                <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                  <BookCover cover={launch.cover} title={launch.title} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="rounded-full bg-gold px-2 py-0.5 text-ink">
                      {launch.preOrder ? "Pré-venda" : "Lançamento"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--text-muted)]">
                      <IconClock className="h-3 w-3" />
                      {new Date(launch.releaseDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-1 text-base font-bold group-hover:text-gold">{launch.title}</p>
                  {launch.highlight && (
                    <p className="text-sm text-[var(--text-muted)]">{launch.highlight}</p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                    Ver página
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Produtos em lançamento"
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
