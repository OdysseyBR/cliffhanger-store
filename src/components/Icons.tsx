import type { ReactNode, SVGProps } from "react";

/**
 * Set unificado de ícones da loja — SVG inline no estilo traço
 * (24×24, stroke 1.8, pontas arredondadas). Nada de emoji: o emoji
 * renderiza diferente em cada sistema operacional e quebra a identidade.
 * Todos herdam `currentColor` para acompanharem a paleta do tema (Fase 2).
 */

type IconProps = SVGProps<SVGSVGElement>;

function Stroke({
  children,
  className = "h-5 w-5",
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------- header (utilidades) ---------- */

export function IconMenu(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Stroke>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Stroke>
  );
}

export function IconHeart({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <Stroke {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </Stroke>
  );
}

export function IconUser({
  logged = false,
  ...props
}: IconProps & { logged?: boolean }) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="8" r="4" fill={logged ? "currentColor" : "none"} />
      <path d="M4.5 21c1.2-3.4 4.1-5.2 7.5-5.2s6.3 1.8 7.5 5.2" />
    </Stroke>
  );
}

export function IconCart(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M2.5 3.5h2.1l2.5 11.7a1.9 1.9 0 0 0 1.9 1.5h8.6a1.9 1.9 0 0 0 1.9-1.5L21 7H5.4" />
      <circle cx="9.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </Stroke>
  );
}

/* ---------- Menu Buttons (10 destinos) ---------- */

/** Loja — sacola de compras. */
export function IconBag(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Stroke>
  );
}

/** Livros — livro fechado com lombada. */
export function IconBook(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Stroke>
  );
}

/** E-books — tablet/digital. */
export function IconTablet(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </Stroke>
  );
}

/** Audiobooks — fone de ouvido. */
export function IconHeadphones(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M3.5 14v-2a8.5 8.5 0 0 1 17 0v2" />
      <rect x="2.5" y="14" width="4.5" height="7" rx="2" />
      <rect x="17" y="14" width="4.5" height="7" rx="2" />
    </Stroke>
  );
}

/** Produtos — camiseta (merch oficial). */
export function IconShirt(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </Stroke>
  );
}

/** Colecionáveis — dado (sorte/edição limitada). */
export function IconDice(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <g fill="currentColor" stroke="none">
        <circle cx="8" cy="8" r="1.35" />
        <circle cx="16" cy="8" r="1.35" />
        <circle cx="12" cy="12" r="1.35" />
        <circle cx="8" cy="16" r="1.35" />
        <circle cx="16" cy="16" r="1.35" />
      </g>
    </Stroke>
  );
}

/** Universos — globo. */
export function IconGlobe(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5c2.7 2.67 4.5 6.09 4.5 9.5s-1.8 6.83-4.5 9.5c-2.7-2.67-4.5-6.09-4.5-9.5s1.8-6.83 4.5-9.5z" />
    </Stroke>
  );
}

/** Autores — caneta. */
export function IconPen(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Stroke>
  );
}

/** Lançamentos — foguete. */
export function IconRocket(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </Stroke>
  );
}

/** Ofertas — etiqueta de preço. */
export function IconTag(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    </Stroke>
  );
}

/* ---------- feedback e navegação ---------- */

/** Relógio (countdown de campanha). */
export function IconClock(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Stroke>
  );
}

/** Estrela de avaliação. */
export function IconStar({
  filled = true,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <Stroke {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M12 2.6l2.75 5.57 6.15.9-4.45 4.34 1.05 6.13L12 16.67l-5.5 2.87 1.05-6.13L3.1 9.07l6.15-.9z" />
    </Stroke>
  );
}

/** Faísca decorativa (separador do marquee). */
export function IconSparkle(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 3.5 13.7 9.3 19.5 11l-5.8 1.7L12 18.5l-1.7-5.8L4.5 11l5.8-1.7Z" />
    </Stroke>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="m14.5 18-6-6 6-6" />
    </Stroke>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="m9.5 18 6-6-6-6" />
    </Stroke>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Stroke>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M20 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Stroke>
  );
}

export function IconArrowUp(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </Stroke>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </Stroke>
  );
}

/** Fechar (✕ do editor/admin). */
export function IconX(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Stroke>
  );
}

/** Link externo (↗). */
export function IconExternal(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
    </Stroke>
  );
}

/** Confirmação (mensagens ✓ do painel). */
export function IconCheck(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Stroke>
  );
}

/* ---------- logos de marca (login social) ---------- */

/** Google "G" — monocromático (herda a cor do tema via currentColor). */
export function IconGoogleG(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" className="h-4 w-4" aria-hidden {...props}>
      <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Facebook "f" — monocromático (herda a cor do tema via currentColor). */
export function IconFacebookF(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
