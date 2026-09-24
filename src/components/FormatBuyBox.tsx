"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";

export interface BuyFormat {
  id: string;
  slug: string;
  label: string;
  price: number;
  preOrder?: boolean;
}

/**
 * Buy box da página de obra: pills de formato com preço e
 * um único CTA principal — no lugar de vários botões iguais.
 */
export function FormatBuyBox({
  formats,
  defaultIndex = 0,
}: {
  formats: BuyFormat[];
  defaultIndex?: number;
}) {
  const [selected, setSelected] = useState(defaultIndex);
  const current = formats[selected] ?? formats[0];
  if (!current) return null;

  return (
    <div className="card mt-6 max-w-xl p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Formatos</p>
      <div className="flex flex-wrap gap-2">
        {formats.map((format, index) => (
          <button
            key={format.id}
            type="button"
            onClick={() => setSelected(index)}
            aria-pressed={index === selected}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              index === selected
                ? "border-transparent bg-violet text-paper"
                : "border-[var(--border)] hover:border-violet-soft"
            }`}
          >
            {format.label} · {formatPrice(format.price)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-display text-3xl text-gold">{formatPrice(current.price)}</span>
        <Link href={`/produtos/${current.slug}`} className="btn btn-primary flex-1 sm:flex-none">
          {current.preOrder ? "Pré-venda" : "Comprar"} agora
        </Link>
      </div>
    </div>
  );
}
