import { BookCover } from "@/components/BookCover";
import { categoryLabels } from "@/data/catalog";
import type { Product } from "@/lib/types";

const brandColors = [
  { bg: "#5603AD", fg: "#F8FEFF", accent: "#FDC500" },
  { bg: "#0C0014", fg: "#FDC500", accent: "#5603AD" },
  { bg: "#FDC500", fg: "#0C0014", accent: "#5603AD" },
  { bg: "#F8FEFF", fg: "#5603AD", accent: "#0C0014" },
];

/**
 * Arte do produto: livros/formatos usam a capa da obra; produtos físicos
 * (camisetas, canecas, posters, colecionáveis) usam um bloco gráfico da
 * marca com o monograma CH — não existem fotos de produto no projeto.
 */
export function ProductArt({ product }: { product: Product }) {
  const isBookish =
    product.category === "livros" ||
    product.category === "ebooks" ||
    product.category === "audiobooks";

  if (isBookish && product.cover) {
    return (
      <BookCover
        cover={product.cover}
        title={product.title.split("—")[0].trim()}
        label={categoryLabels[product.category]}
      />
    );
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
      <text
        x="150"
        y="248"
        textAnchor="middle"
        fill={fg}
        fontFamily="var(--font-display-face), Impact, sans-serif"
        fontSize="140"
        letterSpacing="-6"
      >
        CH
      </text>
      <rect x="40" y="352" width="220" height="8" fill={fg} opacity="0.6" />
      <text
        x="150"
        y="404"
        textAnchor="middle"
        fill={fg}
        fontFamily="var(--font-body-face), sans-serif"
        fontSize="24"
        fontWeight="800"
        letterSpacing="4"
      >
        {categoryLabels[product.category].toUpperCase()}
      </text>
    </svg>
  );
}
