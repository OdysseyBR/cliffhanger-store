"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import type { Product } from "@/lib/types";

/** Bloco de compra da página de produto: quantidade + carrinho + wishlist. */
export function AddToCart({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock === 0 && !product.digital;
  const wished = isWished(product.id);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[var(--text-muted)]">Quantidade</span>
        <div className="flex items-center rounded-full border border-[var(--border)]">
          <button
            type="button"
            className="px-3 py-1.5 text-lg transition hover:text-gold"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button
            type="button"
            className="px-3 py-1.5 text-lg transition hover:text-gold"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
        {!product.digital && product.stock > 0 && product.stock <= 20 && (
          <span className="text-xs font-bold uppercase text-[#e5484d]">
            Restam {product.stock}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={soldOut}
          onClick={() => addToCart(product.id, qty)}
        >
          {soldOut ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wished}
        >
          {wished ? "♥ Na wishlist" : "♡ Wishlist"}
        </button>
      </div>

      <ul className="mt-4 space-y-1 text-xs text-[var(--text-muted)]">
        <li>
          {product.digital
            ? "Entrega digital: acesso liberado na Biblioteca após pagamento"
            : "Envio para todo o Brasil · frete calculado no checkout"}
        </li>
        <li>Pagamento por PIX, cartão de crédito ou débito</li>
        <li>Compra segura · suporte pela Cliffhanger Store</li>
      </ul>
    </div>
  );
}
