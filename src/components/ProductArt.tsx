"use client";

import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import type { Product } from "@/lib/types";

const brandColors = [
  { bg: "#5603AD", fg: "#F8FEFF", accent: "#FDC500" },
  { bg: "#0C0014", fg: "#FDC500", accent: "#5603AD" },
  { bg: "#FDC500", fg: "#0C0014", accent: "#5603AD" },
  { bg: "#F8FEFF", fg: "#5603AD", accent: "#0C0014" },
];

/**
 * Arte do produto: prioriza a imagem enviada por upload no criador de
 * itens (§23 — Cloudinary); sem imagem (ou se ela falhar ao carregar),
 * livros/formatos usam a capa da obra e os demais usam só o bloco
 * gráfico da marca — geometria pura, sem nome, rótulo ou monograma.
 */
export function ProductArt({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(product.image) && !imageFailed;
  const isBookish =
    product.category === "livros" ||
    product.category === "ebooks" ||
    product.category === "audiobooks";

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

  if (isBookish && product.cover) {
    // §7 — a capa do produto não projeta nome nem rótulo: só a arte
    // (imagem de upload quando existir; no fallback, o desenho sozinho).
    return <BookCover cover={product.cover} />;
  }

  const seed =
    product.id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % brandColors.length;
  const { bg, fg, accent } = brandColors[seed];

  return (
    <svg
      viewBox="0 0 300 450"
      role="img"
      aria-label={product.title}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="300" height="450" fill={bg} />
      <circle cx="150" cy="200" r="104" fill={accent} opacity="0.18" />
      <path d="M40 320 L150 96 L260 320 Z" fill={accent} opacity="0.35" />
      <path d="M40 320 L150 448 L260 320 Z" fill={fg} opacity="0.1" />
      <rect x="40" y="352" width="220" height="8" fill={fg} opacity="0.6" />
      <rect x="40" y="376" width="112" height="8" fill={fg} opacity="0.32" />
    </svg>
  );
}
