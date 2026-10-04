"use client";

import { useState } from "react";
import { ChCover } from "@/components/ChCover";
import { categoryLabels, typeLabels } from "@/data/catalog";
import type { Product } from "@/lib/types";

/**
 * Arte do produto — Etapa K (só duas possibilidades):
 *
 *   1. imagem enviada por upload no criador de itens (Cloudinary, §23);
 *   2. sem imagem (ou se ela falhar): capa ilustrada CH — monograma +
 *      tipo do produto + categoria, nas cores do tema ativo.
 */
export function ProductArt({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(product.image) && !imageFailed;

  if (hasImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL livre do CMS (Cloudinary ou caminho interno); next/image exigiria remotePatterns por host
      <img
        src={product.image}
        alt={product.title}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <ChCover
      kind={typeLabels[product.type] ?? "Produto"}
      subtitle={categoryLabels[product.category]}
    />
  );
}
