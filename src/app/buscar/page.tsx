import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { searchCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busca global na Cliffhanger Store: obras, produtos, autores e universos.",
};

/** Busca global (Documento Mestre 6.3). */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await searchCatalog(q);
  const total =
    results.products.length +
    results.works.length +
    results.authors.length +
    results.universes.length;

  return (
    <Page>
      <Section title="Buscar" subtitle="Obras, produtos, e-books, audiobooks, autores e universos.">
        <form action="/buscar" method="GET" className="mb-8 flex max-w-2xl gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ex.: valeharts, caneca, helena…"
            className="field"
            aria-label="Termo de busca"
          />
          <button type="submit" className="btn btn-accent">
            Buscar
          </button>
        </form>

        {q && (
          <p className="mb-6 text-sm text-[var(--text-muted)]">
            <strong className="text-gold">{total}</strong> resultado
            {total === 1 ? "" : "s"} para “{q}”
          </p>
        )}

        {!q && (
          <div className="card p-10 text-center">
            <p className="text-display text-3xl">Digite algo para começar</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              A busca é global e retorna obras, produtos, autores e universos ao mesmo tempo.
            </p>
          </div>
        )}

        {q && total === 0 && (
          <div className="card p-10 text-center">
            <p className="text-display text-3xl">Nada encontrado</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Tente outro termo ou navegue pelo catálogo completo.
            </p>
            <Link href="/loja" className="btn btn-primary mt-4">
              Ir para a loja
            </Link>
          </div>
        )}

        {results.products.length > 0 && (
          <div className="mb-10">
            <h2 className="text-display mb-4 text-2xl text-gold">Produtos</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {results.works.length > 0 && (
          <div className="mb-10">
            <h2 className="text-display mb-4 text-2xl text-gold">Obras</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.works.map((work) => (
                <Link key={work.id} href={`/obras/${work.slug}`} className="card p-5 transition hover:border-violet-soft">
                  <p className="text-lg font-bold">{work.title}</p>
                  <p className="line-clamp-2 text-sm text-[var(--text-muted)]">{work.subtitle ?? work.synopsis}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {results.authors.length > 0 && (
          <div className="mb-10">
            <h2 className="text-display mb-4 text-2xl text-gold">Autores</h2>
            <div className="flex flex-wrap gap-3">
              {results.authors.map((author) => (
                <Link key={author.id} href={`/autores/${author.slug}`} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold transition hover:border-gold hover:text-gold">
                  {author.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {results.universes.length > 0 && (
          <div>
            <h2 className="text-display mb-4 text-2xl text-gold">Universos</h2>
            <div className="flex flex-wrap gap-3">
              {results.universes.map((universe) => (
                <Link key={universe.id} href={`/universos/${universe.slug}`} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold transition hover:border-gold hover:text-gold">
                  {universe.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>
    </Page>
  );
}
