import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { getAuthorBySlug, getAuthors, getCatalog } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const authors = await getAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Autor não encontrado" };
  return { title: author.name, description: author.bio.slice(0, 180) };
}

/** Página de autor (Documento Mestre 5.6). */
export default async function AutorPage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const catalog = await getCatalog();
  const works = catalog.works.filter((w) => w.authorId === author.id);
  const products = catalog.products.filter(
    (p) => p.authorId === author.id || works.some((w) => w.id === p.workId),
  );
  const universes = catalog.universes.filter((u) =>
    works.some((w) => w.universeId === u.id),
  );

  return (
    <Page>
      <section className="border-b border-[var(--border)] bg-glow/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[160px_1fr] lg:px-8">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-violet text-4xl font-extrabold text-paper lg:h-40 lg:w-40">
            {author.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
              {author.role}
            </span>
            <h1 className="text-display mt-2 text-5xl sm:text-6xl">{author.name}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
              {author.bio}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {universes.map((universe) => (
                <Link
                  key={universe.id}
                  href={`/universos/${universe.slug}`}
                  className="btn btn-ghost px-4 py-2"
                >
                  🌌 {universe.name}
                </Link>
              ))}
            </div>
          </div>
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

      {products.length > 0 && (
        <Section title="Produtos relacionados" subtitle="Livros, formatos digitais e derivados.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
