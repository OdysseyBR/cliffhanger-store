"use client";

import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";
import { Stars } from "@/components/Stars";
import { useStore } from "@/components/Providers";
import { discountPercent, formatPrice } from "@/lib/format";
import { typeLabels } from "@/data/catalog";
import type { Product } from "@/lib/types";

const badgeTone: Record<string, string> = {
  NOVO: "bg-[#30a46c] text-white",
  "LANÇAMENTO": "bg-violet text-paper",
  "PRÉ-VENDA": "bg-gold text-ink",
  EXCLUSIVO: "bg-ink text-gold",
  LIMITADO: "bg-[#e5484d] text-white",
  "BEST-SELLER": "bg-gold text-ink",
  ESGOTANDO: "bg-[#e5484d] text-white",
  OFERTA: "bg-[#e5484d] text-white",
  DIGITAL: "bg-violet text-paper",
  "EDIÇÃO ESPECIAL": "bg-ink text-gold",
};

export function ProductCard({ product, widthClass = "" }: { product: Product; widthClass?: string }) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const off = discountPercent(product.price, product.compareAt);
  const wished = isWished(product.id);
  const soldOut = product.stock === 0 && !product.digital;

  return (
    <article
      className={`group card relative flex h-full w-full flex-col overflow-hidden transition hover:-translate-y-1 hover:border-violet-soft ${widthClass}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-ink/40">
        <Link href={`/produtos/${product.slug}`} className="block h-full w-full">
          <div className="cover-shine h-full w-full overflow-hidden">
            <ProductArt product={product} />
          </div>
        </Link>

        {product.badge && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
              badgeTone[product.badge] ?? "bg-violet text-paper"
            }`}
          >
            {product.badge}
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? "Remover da wishlist" : "Salvar na wishlist"}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)]/90 text-lg transition hover:scale-110 ${
            wished ? "text-[#e5484d]" : "text-[var(--text-muted)]"
          }`}
        >
          {wished ? "♥" : "♡"}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gold">
          <span>{typeLabels[product.type]}</span>
          {product.digital && <span className="text-[var(--text-muted)]">· digital</span>}
        </div>

        <Link
          href={`/produtos/${product.slug}`}
          className="line-clamp-2 text-sm font-bold leading-snug transition hover:text-gold"
        >
          {product.title}
        </Link>

        <Stars rating={product.rating} count={product.reviewCount} />

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {off && (
              <span className="text-xs text-[var(--text-muted)] line-through">
                {formatPrice(product.compareAt!)}
              </span>
            )}
            <span className="text-display text-xl text-gold">{formatPrice(product.price)}</span>
          </div>

          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToCart(product.id)}
            className="btn btn-primary px-3 py-2 text-[11px]"
          >
            {soldOut ? "Esgotado" : "Comprar"}
          </button>
        </div>
      </div>
    </article>
  );
}
