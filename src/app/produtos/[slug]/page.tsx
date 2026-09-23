import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { Page } from "@/components/Page";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { Stars } from "@/components/Stars";
import { categoryLabels, typeLabels } from "@/data/catalog";
import { formatDate, formatPrice } from "@/lib/format";
import { getCatalog, getProductBySlug } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.title,
    description: product.description.slice(0, 180),
  };
}

const reviews = [
  {
    name: "Marina S.",
    text: "Chegou antes do prazo, embalagem impecável. A edição superou a expectativa.",
    rating: 5,
  },
  {
    name: "Rafael T.",
    text: "Impressão de alta qualidade e a história prende do primeiro ao último capítulo.",
    rating: 5,
  },
  {
    name: "Camila O.",
    text: "Ótima relação custo-benefício. Já quero o próximo volume.",
    rating: 4,
  },
];

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const catalog = await getCatalog();
  const work = catalog.works.find((w) => w.id === product.workId);
  const author = catalog.authors.find((a) => a.id === product.authorId);
  const universe = catalog.universes.find((u) => u.id === product.universeId);

  const sameWork = catalog.products.filter(
    (p) => p.workId === product.workId && p.id !== product.id,
  );
  const sameUniverse = catalog.products.filter(
    (p) =>
      p.universeId === product.universeId &&
      p.id !== product.id &&
      !sameWork.some((s) => s.id === p.id),
  );
  const related = [...sameWork, ...sameUniverse].slice(0, 4);

  const off =
    product.compareAt && product.compareAt > product.price
      ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
      : null;

  return (
    <Page>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-[var(--text-muted)]">
          <Link href="/" className="hover:text-gold">
            Início
          </Link>{" "}
          /{" "}
          <Link href={`/${product.category === "livros" ? "livros" : product.category}`} className="hover:text-gold">
            {categoryLabels[product.category]}
          </Link>{" "}
          / <span className="text-[var(--text)]">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* imagem + info */}
          <div className="card overflow-hidden">
            <div className="aspect-[2/3]">
              <ProductArt product={product} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="text-gold">{typeLabels[product.type]}</span>
              {product.badge && (
                <span className="rounded-full bg-violet px-2.5 py-1 text-paper">
                  {product.badge}
                </span>
              )}
              {product.digital && (
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
                  Digital
                </span>
              )}
            </div>

            <h1 className="text-display text-4xl sm:text-5xl">{product.title}</h1>

            <Stars rating={product.rating} count={product.reviewCount} />

            <div className="flex flex-wrap items-end gap-3">
              <span className="text-display text-4xl text-gold">{formatPrice(product.price)}</span>
              {product.compareAt && (
                <span className="text-lg text-[var(--text-muted)] line-through">
                  {formatPrice(product.compareAt)}
                </span>
              )}
              {off && (
                <span className="rounded-full bg-[#e5484d] px-3 py-1 text-xs font-extrabold text-white">
                  {off}% OFF
                </span>
              )}
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              {product.description}
            </p>

            {product.releaseDate && (
              <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
                <strong className="text-gold">Data prevista:</strong>{" "}
                {formatDate(product.releaseDate)}
              </p>
            )}

            <AddToCart product={product} />

            {product.specs.length > 0 && (
              <div className="card p-5">
                <h2 className="text-display mb-3 text-2xl">Especificações</h2>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {product.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex justify-between gap-4 border-b border-[var(--border)] pb-2"
                    >
                      <dt className="text-[var(--text-muted)]">{spec.label}</dt>
                      <dd className="text-right font-semibold">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sobre a obra + autor */}
      {work && (
        <Section
          title="Sobre a obra"
          href={`/obras/${work.slug}`}
          hrefLabel="Página da obra"
        >
          <div className="card grid gap-6 p-6 lg:grid-cols-[1fr_260px]">
            <div>
              <h3 className="text-display text-3xl">
                {work.title}
                {work.subtitle && <span className="block text-gold">{work.subtitle}</span>}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
                {work.synopsis}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {author && (
                  <Link href={`/autores/${author.slug}`} className="btn btn-ghost px-3 py-2">
                    ✍️ {author.name}
                  </Link>
                )}
                {universe && (
                  <Link href={`/universos/${universe.slug}`} className="btn btn-ghost px-3 py-2">
                    🌌 {universe.name}
                  </Link>
                )}
                <span className="btn btn-ghost px-3 py-2">Ano {work.year}</span>
              </div>
            </div>
            {author && (
              <div className="border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <p className="text-xs font-bold uppercase tracking-wider text-gold">Autor</p>
                <p className="mt-1 text-lg font-bold">{author.name}</p>
                <p className="mt-1 line-clamp-4 text-xs text-[var(--text-muted)]">{author.bio}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Avaliações */}
      <Section title="Avaliações">
        <div className="grid gap-4 lg:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.name} className="card p-5">
              <Stars rating={review.rating} />
              <p className="mt-3 text-sm text-[var(--text-muted)]">“{review.text}”</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-gold">
                {review.name}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* Outros formatos e relacionados */}
      {related.length > 0 && (
        <Section
          title="Outros formatos e relacionados"
          subtitle={
            sameWork.length > 0
              ? "Mesma obra em outros formatos e produtos do mesmo universo."
              : "Produtos do mesmo universo."
          }
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
