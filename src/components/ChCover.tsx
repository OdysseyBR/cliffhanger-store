/**
 * Capa ilustrada CH — substitui os motivos antigos (farol, circuito, maré,
 * sal, recorte) na Etapa K. Duas possibilidades de arte de produto:
 *
 *   1. imagem enviada por upload (Cloudinary) — exibida pelo ProductArt;
 *   2. sem imagem — esta capa: monograma CH + TIPO (livro, e-book,
 *      audiobook, produto, colecionável…) + categoria/nome embaixo.
 *
 * Tudo em variáveis CSS do tema ativo (`--surface-raised`, `--brand`,
 * `--accent`, `--text`…), então acompanha qualquer paleta sem hex fixo.
 */
export function ChCover({
  kind,
  subtitle,
  variant = "full",
  className = "",
}: {
  /** Tipo: "Livro físico", "E-book", "Universo", "Obra", "Lançamento"… */
  kind: string;
  /** Segunda linha: categoria ("Livros") ou nome da entidade. */
  subtitle?: string;
  /** "backdrop" = só a arte (banners/full-bleed; sem texto que poderia
   *  ser cortado em containers largos). "full" = CH + tipo + categoria. */
  variant?: "full" | "backdrop";
  className?: string;
}) {
  const kindText = (kind || "Produto").trim().toUpperCase();
  const subText = (subtitle ?? "").trim().toUpperCase();

  return (
    <svg
      viewBox="0 0 300 450"
      role="img"
      aria-label={subText || kindText}
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* fundo do tema + lombada da marca */}
      <rect width="300" height="450" fill="var(--surface-raised)" />
      <rect x="0" y="0" width="12" height="450" fill="var(--brand)" />

      {/* recorte geométrico — mesma linguagem gráfica da identidade */}
      <circle cx="150" cy="168" r="92" fill="var(--brand)" opacity="0.22" />
      <path d="M60 300 L150 120 L240 300 Z" fill="var(--accent)" opacity="0.14" />

      {variant === "backdrop" ? (
        /* monograma centralizado — seguro em containers largos (o corte
           vertical sempre mostra o centro do viewBox) */
        <text
          x="150"
          y="280"
          textAnchor="middle"
          fill="var(--accent)"
          fontFamily="var(--font-display-face), Impact, sans-serif"
          fontSize="150"
          letterSpacing="2"
        >
          CH
        </text>
      ) : (
        <g>
          {/* monograma CH */}
          <text
            x="154"
            y="216"
            textAnchor="middle"
            fill="var(--accent)"
            fontFamily="var(--font-display-face), Impact, sans-serif"
            fontSize="148"
            letterSpacing="2"
          >
            CH
          </text>

          {/* filete */}
          <rect x="34" y="292" width="232" height="6" fill="var(--brand)" />
          <path d="M244 404 h34 v34 h-34 Z" fill="var(--accent)" opacity="0.9" />

          {/* TIPO do produto / entidade */}
          <text
            x="150"
            y="350"
            textAnchor="middle"
            fill="var(--text)"
            fontFamily="var(--font-display-face), Impact, sans-serif"
            fontSize={kindText.length > 12 ? 30 : kindText.length > 8 ? 34 : 40}
            letterSpacing="1"
            textLength={kindText.length > 8 ? 236 : undefined}
            lengthAdjust={kindText.length > 8 ? "spacingAndGlyphs" : undefined}
          >
            {kindText}
          </text>

          {/* categoria (produtos) ou nome (universos/obras/lançamentos) */}
          {subText && (
            <text
              x="150"
              y="386"
              textAnchor="middle"
              fill="var(--text-muted)"
              fontFamily="var(--font-body-face), sans-serif"
              fontSize="14"
              fontWeight="700"
              letterSpacing="2.5"
              textLength={subText.length > 14 ? 232 : undefined}
              lengthAdjust={subText.length > 14 ? "spacingAndGlyphs" : undefined}
            >
              {subText.length > 28 ? `${subText.slice(0, 27)}…` : subText}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
