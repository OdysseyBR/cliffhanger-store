"use client";

import Link from "next/link";
import { useRef } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import type { Product } from "@/lib/types";

/**
 * Destaques com side scroll horizontal (Documento Mestre 3.5).
 * Terceiro bloco fixo da Home.
 */
export function Destaques({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.min(el.clientWidth * 0.8, 720), behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <Section
      title="Destaques"
      subtitle="Seleção editorial, lançamentos e produtos em destaque — arraste para o lado."
      href="/loja"
      hrefLabel="Ver a loja"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute -left-2 top-1/3 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] shadow transition hover:border-gold sm:grid"
          aria-label="Rolar para a esquerda"
        >
          ←
        </button>

        <div ref={trackRef} className="scroll-x pr-6">
          {products.map((product) => (
            <div key={product.id} className="w-[240px] sm:w-[268px]">
              <ProductCard product={product} />
            </div>
          ))}

          <Link
            href="/loja"
            className="card grid h-full w-[240px] shrink-0 place-items-center p-6 text-center transition hover:border-gold sm:w-[268px]"
          >
            <span>
              <span className="text-display block text-3xl text-gold">Ver tudo</span>
              <span className="mt-2 block text-sm text-[var(--text-muted)]">
                {products.length} destaques na loja
              </span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute -right-2 top-1/3 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] shadow transition hover:border-gold sm:grid"
          aria-label="Rolar para a direita"
        >
          →
        </button>
      </div>
    </Section>
  );
}
