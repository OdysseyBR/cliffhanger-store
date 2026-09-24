import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { FormatBuyBox } from "@/components/FormatBuyBox";
import { IconGlobe, IconPen } from "@/components/Icons";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { typeLabels } from "@/data/catalog";
import { getCatalog, getWorkBySlug, getWorks } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const works = await getWorks();
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) return { title: "Obra não encontrada" };
  return {
    title: `${work.title}${work.subtitle ? `: ${work.subtitle}` : ""}`,
    description: work.synopsis.slice(0, 180),
  };
}

/** Página de obra (Documento Mestre 5.4). */
export default async function ObraPage({ params }: Props) {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) notFound();

  const catalog = await getCatalog();
  const author = catalog.authors.find((a) => a.id === work.authorId);
  const universe = catalog.universes.find((u) => u.id === work.universeId);

  const formats = catalog.products.filter(
    (p) =>
      p.workId === work.id &&
      (p.category === "livros" || p.category === "ebooks" || p.category === "audiobooks"),
  );
  const seriesWorks = work.seriesName
    ? catalog.works.filter(
        (w) => w.seriesName === work.seriesName && w.id !== work.id,
      )
    : [];
  const universeProducts = catalog.products.filter(
    (p) =>
      p.universeId === work.universeId &&
      !formats.some((f) => f.id === p.id) &&
      p.category !== "livros",
  );

  const defaultFormat = Math.max(
    0,
    formats.findIndex((p) => p.category === "livros" && !p.digital),
  );

  return (
    <Page>
      {/* Banner da obra */}
      <section className="relative isolate overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 opacity-25">
          <BookCover cover={work.cover} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/85 to-[var(--surface)]" />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8 lg:py-16">
          <div className="mx-auto aspect-[2/3] w-full max-w-[280px] overflow-hidden rounded-xl border border-[var(--border)] shadow-2xl">
            <BookCover cover={work.cover} title={work.title} label={work.subtitle ?? undefined} />
          </div>

          <div>
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              {work.seriesName && (
                <span className="rounded-full bg-gold px-3 py-1 text-ink">
                  {work.seriesName} · volume {work.seriesIndex}
                </span>
              )}
              <span className="rounded-full border border-[var(--border)] px-3 py-1">
                {work.year}
              </span>
            </div>

            <h1 className="text-display mt-4 text-5xl sm:text-6xl">{work.title}</h1>
            {work.subtitle && <p className="text-display text-2xl text-gold">{work.subtitle}</p>}

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
              {work.synopsis}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              {author && (
                <Link href={`/autores/${author.slug}`} className="btn btn-ghost inline-flex items-center gap-2 px-4 py-2">
                  <IconPen className="h-4 w-4" />
                  {author.name}
                </Link>
              )}
              {universe && (
                <Link href={`/universos/${universe.slug}`} className="btn btn-ghost inline-flex items-center gap-2 px-4 py-2">
                  <IconGlobe className="h-4 w-4" />
                  {universe.name}
                </Link>
              )}
            </div>

            {formats.length > 0 && (
              <FormatBuyBox
                defaultIndex={defaultFormat}
                formats={formats.map((product) => ({
                  id: product.id,
                  slug: product.slug,
                  label: typeLabels[product.type],
                  price: product.price,
                  preOrder: product.badge === "PRÉ-VENDA",
                }))}
              />
            )}
          </div>
        </div>
      </section>

      {/* Edições, audiobooks e formatos */}
      {formats.length > 0 && (
        <Section title="Edições e formatos" subtitle="Livro físico, e-book, audiobook e edições especiais.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {formats.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* Outros volumes da série */}
      {seriesWorks.length > 0 && (
        <Section title={`Mais em ${work.seriesName}`} href="/livros">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {seriesWorks.map((item) => (
              <Link
                key={item.id}
                href={`/obras/${item.slug}`}
                className="card group overflow-hidden transition hover:-translate-y-1"
              >
                <div className="aspect-[2/3]">
                  <BookCover cover={item.cover} title={item.title} />
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold group-hover:text-gold">{item.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.subtitle ?? item.year}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Produtos do universo */}
      {universeProducts.length > 0 && (
        <Section
          title="Produtos do universo"
          subtitle={`Derivados oficiais de ${universe?.name ?? "este universo"}.`}
          href={universe ? `/universos/${universe.slug}` : "/universos"}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {universeProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* Ficha técnica + contexto (sem sinopse duplicada) */}
      <Section title="Ficha e contexto">
        <div className="card grid gap-6 p-6 lg:grid-cols-2">
          <div>
            <h3 className="text-display text-2xl">Ficha técnica</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2">
                <dt className="text-[var(--text-muted)]">Ano</dt>
                <dd className="font-semibold">{work.year}</dd>
              </div>
              {work.seriesName && (
                <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2">
                  <dt className="text-[var(--text-muted)]">Série</dt>
                  <dd className="text-right font-semibold">
                    {work.seriesName} · volume {work.seriesIndex}
                  </dd>
                </div>
              )}
              {author && (
                <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2">
                  <dt className="text-[var(--text-muted)]">Autor</dt>
                  <dd className="text-right font-semibold">
                    <Link href={`/autores/${author.slug}`} className="hover:text-gold">
                      {author.name}
                    </Link>
                  </dd>
                </div>
              )}
              {universe && (
                <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2">
                  <dt className="text-[var(--text-muted)]">Universo</dt>
                  <dd className="text-right font-semibold">
                    <Link href={`/universos/${universe.slug}`} className="hover:text-gold">
                      {universe.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div>
            <h3 className="text-display text-2xl">Contexto</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {universe ? universe.description : "Universo Cliffhanger em construção."}
            </p>
          </div>
        </div>
      </Section>
    </Page>
  );
}
