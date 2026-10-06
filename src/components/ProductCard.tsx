"use client";

import Link from "next/link";
import { IconHeart } from "@/components/Icons";
import { ProductArt } from "@/components/ProductArt";
import { Stars } from "@/components/Stars";
import { useStore } from "@/components/Providers";
import { discountPercent, formatPrice } from "@/lib/format";
import { typeLabels } from "@/data/catalog";
import { badgeTone } from "@/lib/tones";
import type { Product } from "@/lib/types";

/**
 * Card de produto da loja (usado em Home, categorias, busca, wishlist,
 * relacionados e carrinho). Repaginação §7: capa com scrim + brilho,
 * selo e desconto sobre a arte, título display e bloco de preço com
 * "de/por" — mesma identidade (#0C0014/#5603AD/#FDC500).
 */
export function ProductCard({ product, widthClass = "" }: { product: Product; widthClass?: string }) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const off = discountPercent(product.price, product.compareAt);
  const wished = isWished(product.id);
  const soldOut = product.stock === 0 && !product.digital;
  const lowStock = !product.digital && product.stock > 0 && product.stock <= 5;

  return (
    <article
      className={`group card relative flex h-full w-full flex-col overflow-hidden transition hover:-translate-y-1.5 hover:border-violet-soft ${widthClass}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-ink/40">
        <Link
          href={`/produtos/${product.slug}`}
          className="block h-full w-full"
          aria-label={product.title}
        >
          <div className="h-full w-full overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.045]">
            <ProductArt product={product} />
          </div>
        </Link>

        {/* scrim inferior chapado (P0.4) para o preço/selo respirarem sobre a arte */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-ink/70"
        />

        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          {product.badge && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-lg ${
                badgeTone[product.badge] ?? "bg-violet text-white"
              }`}
            >
              {product.badge}
            </span>
          )}
          {off && !soldOut && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink shadow-lg">
              −{off}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? "Remover da wishlist" : "Salvar na wishlist"}
          aria-pressed={wished}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)]/90 backdrop-blur transition hover:scale-110 ${
            wished ? "text-[#e5484d]" : "text-[var(--text-muted)]"
          }`}
        >
          <IconHeart filled={wished} className="h-4.5 w-4.5" />
        </button>

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-[#e5484d] py-1.5 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gold">
          <span>{typeLabels[product.type]}</span>
          {product.digital && <span className="text-[var(--text-muted)]">· digital</span>}
        </div>

        <Link
          href={`/produtos/${product.slug}`}
          className="line-clamp-2 text-[15px] font-bold leading-snug transition group-hover:text-gold"
        >
          {product.title}
        </Link>

        <Stars rating={product.rating} count={product.reviewCount} />

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-display text-2xl text-gold">{formatPrice(product.price)}</span>
            {off && (
              <span className="text-xs text-[var(--text-muted)] line-through">
                {formatPrice(product.compareAt!)}
              </span>
            )}
            {lowStock && (
              <span className="w-full text-[10px] font-extrabold uppercase tracking-wider text-[#e5484d]">
                Restam apenas {product.stock}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToCart(product.id)}
            className="btn btn-primary w-full py-2.5 text-[11px]"
          >
            {soldOut ? "Esgotado" : "Comprar"}
          </button>
        </div>
      </div>
    </article>
  );
}
