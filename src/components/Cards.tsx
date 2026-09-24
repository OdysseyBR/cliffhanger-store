import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { IconArrowRight } from "@/components/Icons";
import { ProductArt } from "@/components/ProductArt";
import { Stars } from "@/components/Stars";
import { formatPrice } from "@/lib/format";
import type { Collection, Product, Universe, Work } from "@/lib/types";

export function UniverseCard({ universe }: { universe: Universe }) {
  return (
    <Link
      href={`/universos/${universe.slug}`}
      className="group card relative isolate flex h-56 flex-col justify-end overflow-hidden p-5 transition hover:-translate-y-1"
    >
      <div className="absolute inset-0 -z-10">
        <BookCover cover={universe.cover} className="opacity-70 transition group-hover:opacity-90" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
      <span className="text-display text-3xl text-paper">{universe.name}</span>
      <span className="mt-1 line-clamp-2 text-xs text-paper/80">{universe.tagline}</span>
    </Link>
  );
}

export function WorkCard({
  work,
  authorName,
  priceFrom,
  rating,
  reviewCount,
}: {
  work: Work;
  authorName?: string;
  priceFrom?: number;
  rating?: number;
  reviewCount?: number;
}) {
  return (
    <Link
      href={`/obras/${work.slug}`}
      className="group card flex h-full w-full flex-col overflow-hidden transition hover:-translate-y-1 hover:border-violet-soft"
    >
      <div className="aspect-[2/3] overflow-hidden bg-ink/40">
        <div className="cover-shine h-full w-full">
          <BookCover cover={work.cover} title={work.title} label={work.subtitle ?? undefined} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
          {work.seriesName ? `${work.seriesName} · ${work.seriesIndex}` : work.year}
        </span>
        <span className="line-clamp-2 text-sm font-bold transition group-hover:text-gold">
          {work.title}
          {work.subtitle && <span className="block font-normal opacity-80">{work.subtitle}</span>}
        </span>
        {authorName && (
          <span className="text-xs text-[var(--text-muted)]">{authorName}</span>
        )}
        {(typeof priceFrom === "number" || typeof rating === "number") && (
          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-[var(--border)] pt-3">
            <div className="flex flex-col gap-1">
              {typeof rating === "number" && <Stars rating={rating} count={reviewCount} />}
              {typeof priceFrom === "number" && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  a partir de{" "}
                  <strong className="text-sm text-gold">{formatPrice(priceFrom)}</strong>
                </span>
              )}
            </div>
            <span className="btn btn-primary px-3 py-1.5 text-[11px]">Ver obra</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function CollectionCard({
  collection,
  products,
}: {
  collection: Collection;
  products: Product[];
}) {
  const items = collection.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p))
    .slice(0, 3);

  const total = collection.productIds.reduce((sum, id) => {
    const p = products.find((prod) => prod.id === id);
    return sum + (p?.price ?? 0);
  }, 0);

  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-display text-2xl">{collection.title}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{collection.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gold px-3 py-1 text-xs font-extrabold text-ink">
          {collection.productIds.length} itens
        </span>
      </div>

      <div className="flex gap-3">
        {items.map((product) => (
          <Link
            key={product.id}
            href={`/produtos/${product.slug}`}
            className="h-28 w-20 overflow-hidden rounded-lg border border-[var(--border)]"
            title={product.title}
          >
            <ProductArt product={product} />
          </Link>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">
          Suma da coleção:{" "}
          <strong className="text-gold">{formatPrice(total)}</strong>
        </span>
        <Link href="/loja" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold hover:underline">
          Explorar
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
