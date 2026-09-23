import type { Cover } from "@/lib/types";

/**
 * Capa geométrica gerada em SVG — a identidade visual Cliffhanger é baseada
 * em "recortes" (cutout), então as capas são compostas graficamente em vez
 * de fotografias, seguindo a paleta oficial.
 */
export function BookCover({
  cover,
  title,
  label,
  className = "",
}: {
  cover?: Cover;
  title?: string;
  label?: string;
  className?: string;
}) {
  const {
    bg = "#5603AD",
    fg = "#F8FEFF",
    accent = "#FDC500",
    motif = "recorte",
  } = cover ?? {};

  return (
    <svg
      viewBox="0 0 300 450"
      role="img"
      aria-label={title ?? "Capa"}
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`g-${motif}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor={bg} stopOpacity={0.72} />
        </linearGradient>
      </defs>

      <rect width="300" height="450" fill={`url(#g-${motif})`} />

      {/* lombada */}
      <rect x="0" y="0" width="14" height="450" fill={accent} opacity="0.85" />
      <rect x="14" y="0" width="3" height="450" fill={fg} opacity="0.25" />

      {motif === "farol" && (
        <g opacity="0.95">
          <path d="M150 120 L176 330 L124 330 Z" fill={fg} opacity="0.9" />
          <rect x="138" y="96" width="24" height="26" fill={accent} />
          <path d="M150 108 L30 60 L30 156 Z" fill={accent} opacity="0.35" />
          <path d="M150 108 L270 60 L270 156 Z" fill={accent} opacity="0.35" />
          <rect x="118" y="330" width="64" height="12" fill={fg} opacity="0.8" />
          <path d="M40 372 q55 -26 110 0 t110 0" stroke={fg} strokeWidth="5" fill="none" opacity="0.5" />
          <path d="M40 396 q55 -26 110 0 t110 0" stroke={accent} strokeWidth="5" fill="none" opacity="0.7" />
        </g>
      )}

      {motif === "circuito" && (
        <g opacity="0.9">
          <path
            d="M40 90 h80 v70 h60 v70 h-70 v80 h100"
            stroke={fg}
            strokeWidth="6"
            fill="none"
            opacity="0.75"
          />
          <path
            d="M60 400 h70 v-60 h90 v-90 h50"
            stroke={accent}
            strokeWidth="6"
            fill="none"
          />
          <circle cx="120" cy="90" r="9" fill={accent} />
          <circle cx="180" cy="230" r="9" fill={fg} />
          <circle cx="210" cy="340" r="9" fill={accent} />
          <circle cx="130" cy="400" r="9" fill={fg} />
          <rect x="196" y="150" width="70" height="46" fill={fg} opacity="0.35" />
        </g>
      )}

      {motif === "mare" && (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M20 ${170 + i * 34} q40 -24 75 0 t75 0 t75 0`}
              stroke={i % 2 === 0 ? fg : accent}
              strokeWidth="7"
              fill="none"
              opacity={0.85 - i * 0.08}
            />
          ))}
          <circle cx="215" cy="110" r="46" fill={accent} opacity="0.85" />
          <rect x="40" y="86" width="96" height="64" fill={fg} opacity="0.55" />
        </g>
      )}

      {motif === "sal" && (
        <g>
          <path d="M150 96 L214 168 L150 240 L86 168 Z" fill={fg} opacity="0.9" />
          <path d="M150 140 L186 176 L150 212 L114 176 Z" fill={accent} />
          <path d="M70 280 L120 330 L70 380 L20 330 Z" fill={accent} opacity="0.75" />
          <path d="M232 300 L276 344 L232 388 L188 344 Z" fill={fg} opacity="0.7" />
          <rect x="150" y="272" width="120" height="14" fill={fg} opacity="0.5" />
          <rect x="150" y="300" width="84" height="14" fill={accent} opacity="0.7" />
        </g>
      )}

      {motif === "recorte" && (
        <g>
          <circle cx="96" cy="140" r="66" fill={accent} opacity="0.9" />
          <path d="M170 74 L266 160 L170 246 Z" fill={fg} opacity="0.85" />
          <rect x="48" y="250" width="130" height="90" fill={fg} opacity="0.5" />
          <path d="M196 268 h74 v74 h-74 Z" fill={accent} opacity="0.8" />
          <path d="M60 372 h190 v18 H60 Z" fill={fg} opacity="0.6" />
          <path d="M32 60 h60 v10 H32 Z" fill={fg} opacity="0.7" />
        </g>
      )}

      {/* título na capa */}
      {title && (
        <text
          x="34"
          y="404"
          fill={fg}
          fontFamily="var(--font-display-face), Impact, sans-serif"
          fontSize="34"
          letterSpacing="1"
          style={{ textTransform: "uppercase" }}
        >
          {title.length > 18 ? `${title.slice(0, 17)}…` : title}
        </text>
      )}
      {label && (
        <text
          x="34"
          y="428"
          fill={accent}
          fontFamily="var(--font-body-face), sans-serif"
          fontSize="15"
          fontWeight="700"
          letterSpacing="3"
        >
          {label.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
