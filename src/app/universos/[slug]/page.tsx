import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { getCatalog, getUniverseBySlug, getUniverses } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const universes = await getUniverses();
  return universes.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const universe = await getUniverseBySlug(slug);
  if (!universe) return { title: "Universo não encontrado" };
  return { title: `Universo ${universe.name}`, description: universe.tagline };
}

/** Página de universo (Documento Mestre 5.5). */
export default async function UniversoPage({ params }: Props) {
  const { slug } = await params;
  const universe = await getUniverseBySlug(slug);
  if (!universe) notFound();

  const catalog = await getCatalog();
  const works = catalog.works.filter((w) => w.universeId === universe.id);
  const authors = catalog.authors.filter((a) =>
    works.some((w) => w.authorId === a.id),
  );
  const products = catalog.products.filter((p) => p.universeId === universe.id);
  const collections = catalog.collections.filter((c) =>
    c.productIds.some((id) => products.some((p) => p.id === id)),
  );

  return (
    <Page>
      <section className="relative isolate overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 opacity-30">
          <BookCover cover={universe.cover} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/85 to-[var(--surface)]" />

        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-gold">Universo</span>
          <h1 className="text-display mt-3 text-6xl">{universe.name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-muted)]">
            {universe.tagline}
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
            {universe.description}
          </p>
        </div>
      </section>

      {works.length > 0 && (
        <Section title="Obras" href="/livros">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {works.map((work) => (
              <Link
                key={work.id}
                href={`/obras/${work.slug}`}
                className="card group overflow-hidden transition hover:-translate-y-1"
              >
                <div className="aspect-[2/3]">
                  <BookCover cover={work.cover} title={work.title} label={work.subtitle ?? undefined} />
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold group-hover:text-gold">{work.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{work.subtitle ?? work.year}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {authors.length > 0 && (
        <Section title="Autores" href="/autores">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <Link key={author.id} href={`/autores/${author.slug}`} className="card p-5 transition hover:-translate-y-1 hover:border-violet-soft">
                <p className="text-display text-2xl">{author.name}</p>
                <p className="text-xs uppercase tracking-wider text-gold">{author.role}</p>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--text-muted)]">{author.bio}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {products.length > 0 && (
        <Section title="Produtos" subtitle={`Tudo de ${universe.name} disponível na loja.`}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {collections.length > 0 && (
        <Section title="Coleções" href="/loja#colecoes">
          <div className="flex flex-wrap gap-3">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href="/loja#colecoes"
                className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold transition hover:border-gold hover:text-gold"
              >
                {collection.title}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
