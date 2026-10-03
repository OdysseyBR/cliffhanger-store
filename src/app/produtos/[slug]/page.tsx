import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { IconBook, IconGlobe, IconPen } from "@/components/Icons";
import { Page } from "@/components/Page";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { ProductReviews } from "@/components/ProductReviews";
import { Section } from "@/components/Section";
import { Stars } from "@/components/Stars";
import { categoryLabels, typeLabels } from "@/data/catalog";
import { formatDate, formatPrice } from "@/lib/format";
import { getCatalog, getProductBySlug } from "@/lib/data";
import { badgeTone, statusTone } from "@/lib/tones";

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

/**
 * §7 — página de produto completa: imagem, nome, autor, obra/universo,
 * preço e preço anterior, estoque, descrição, especificações,
 * edição/formato, avaliações reais (§19), wishlist, compra, outros
 * formatos e produtos relacionados. Apenas apresentação mudou — dados,
 * rotas e regras de negócio são os mesmos.
 */
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
  const sameFormats = sameWork.filter(
    (p) => p.category === "livros" || p.category === "ebooks" || p.category === "audiobooks",
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

  const status =
    product.stock === 0 && !product.digital
      ? { label: "Esgotado", tone: statusTone.alert }
      : product.digital
        ? { label: "Entrega imediata", tone: statusTone.ok }
        : product.stock <= 5
          ? { label: `Restam ${product.stock} un.`, tone: statusTone.alert }
          : { label: "Pronta entrega", tone: statusTone.ok };

  return (
    <Page>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Link href="/" className="transition hover:text-gold">
            Início
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/${product.category === "livros" ? "livros" : product.category}`}
            className="transition hover:text-gold"
          >
            {categoryLabels[product.category]}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-[var(--text)]">{product.title}</span>
        </nav>

        {/* hero: imagem + buy box */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="card group relative overflow-hidden">
              <div className="cover-shine aspect-[2/3] overflow-hidden bg-ink/40">
                <ProductArt product={product} />
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/85 to-transparent"
              />

              {product.badge && (
                <span
                  className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-lg ${
                    badgeTone[product.badge] ?? "bg-violet text-white"
                  }`}
                >
                  {product.badge}
                </span>
              )}

              {off && !status.label.includes("Esgotado") && (
                <span className="absolute right-4 top-4 rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink shadow-lg">
                  {off}% OFF
                </span>
              )}
            </div>

          </div>

          {/* buy box */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="text-gold">{typeLabels[product.type]}</span>
              <span className={`rounded-full border px-3 py-1 ${status.tone}`}>
                {status.label}
              </span>
              {product.digital && (
                <span className="rounded-full border border-violet-soft/50 bg-violet/15 px-3 py-1 text-violet-soft">
                  Digital
                </span>
              )}
            </div>

            <div>
              <h1 className="text-display text-4xl leading-tight sm:text-5xl">
                {product.title}
              </h1>

              {/* §7 — autor, obra e universo junto ao nome */}
              {(author || work || universe) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {author && (
                    <Link
                      href={`/autores/${author.slug}`}
                      className="btn btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
                    >
                      <IconPen className="h-3.5 w-3.5" />
                      {author.name}
                    </Link>
                  )}
                  {work && (
                    <Link
                      href={`/obras/${work.slug}`}
                      className="btn btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
                    >
                      <IconBook className="h-3.5 w-3.5" />
                      {work.title}
                    </Link>
                  )}
                  {universe && (
                    <Link
                      href={`/universos/${universe.slug}`}
                      className="btn btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
                    >
                      <IconGlobe className="h-3.5 w-3.5" />
                      {universe.name}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <Link href="#avaliacoes" className="w-fit">
              <Stars rating={product.rating} count={product.reviewCount} />
            </Link>

            {/* preço + preço anterior */}
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-display text-5xl text-gold">
                {formatPrice(product.price)}
              </span>
              {product.compareAt && (
                <span className="text-lg text-[var(--text-muted)] line-through">
                  {formatPrice(product.compareAt)}
                </span>
              )}
              {off && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${badgeTone.OFERTA}`}
                >
                  {off}% OFF
                </span>
              )}
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              {product.description}
            </p>

            {product.releaseDate && (
              <p className="max-w-2xl rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
                <strong className="text-gold">Lançamento:</strong>{" "}
                {formatDate(product.releaseDate)}
              </p>
            )}

            {/* outros formatos/edições da mesma obra */}
            {sameFormats.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                  Outros formatos da obra
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white">
                    {typeLabels[product.type]} · {formatPrice(product.price)}
                  </span>
                  {sameFormats.map((format) => (
                    <Link
                      key={format.id}
                      href={`/produtos/${format.slug}`}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition hover:border-violet-soft hover:bg-violet/10"
                    >
                      {typeLabels[format.type]} · {formatPrice(format.price)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <AddToCart product={product} />
          </div>
        </div>

        {/* especificações / edição e formato */}
        {product.specs.length > 0 && (
          <div className="card mt-10 p-6">
            <h2 className="text-display mb-4 text-2xl">Especificações</h2>
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {product.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--border)] pb-2"
                >
                  <dt className="text-[var(--text-muted)]">{spec.label}</dt>
                  <dd className="text-right font-semibold">{spec.value}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--border)] pb-2">
                <dt className="text-[var(--text-muted)]">Edição / formato</dt>
                <dd className="text-right font-semibold">{typeLabels[product.type]}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--border)] pb-2">
                <dt className="text-[var(--text-muted)]">Categoria</dt>
                <dd className="text-right font-semibold">
                  {categoryLabels[product.category]}
                </dd>
              </div>
            </dl>
          </div>
        )}
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
                  <Link href={`/autores/${author.slug}`} className="btn btn-ghost inline-flex items-center gap-2 px-3 py-2">
                    <IconPen className="h-4 w-4" />
                    {author.name}
                  </Link>
                )}
                {universe && (
                  <Link href={`/universos/${universe.slug}`} className="btn btn-ghost inline-flex items-center gap-2 px-3 py-2">
                    <IconGlobe className="h-4 w-4" />
                    {universe.name}
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

      {/* avaliações reais (§19) */}
      <Section
        id="avaliacoes"
        title="Avaliações"
        subtitle="Quem comprou conta como foi — fotos e compra verificada aparecem na publicação."
      >
        <ProductReviews productId={product.id} />
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
