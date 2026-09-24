// Cliffhanger Theme Engine — núcleo puro (sem dependências de servidor).
// Usado pelo layout (SSR), pelo admin (preview no navegador) e pelo seed.

import type {
  HomeSectionKey,
  ThemeModel,
  ThemePhase,
  ThemeColors,
  ThemeZonePlacement,
  ThemeZoneType,
} from "@/lib/types";

export const THEME_SCHEMA_VERSION = 2;

/** Ordem das seções da Home (Documento Mestre 3.6). */
export const HOME_SECTION_ORDER: HomeSectionKey[] = [
  "novidades",
  "mais-vendidos",
  "pre-vendas",
  "edicoes-especiais",
  "universos",
  "derivados",
  "editorial",
  "club",
  "newsletter",
  "recomendacoes",
  "colecoes",
  "ofertas",
];

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  novidades: "Novidades",
  "mais-vendidos": "Mais vendidos",
  "pre-vendas": "Pré-vendas",
  "edicoes-especiais": "Edições especiais",
  universos: "Explore os universos",
  derivados: "Produtos derivados",
  editorial: "Destaque editorial",
  club: "Cliffhanger Club",
  newsletter: "Newsletter",
  recomendacoes: "Recomendações",
  colecoes: "Coleções",
  ofertas: "Ofertas da semana",
};

/** Zonas novas da Home (festivais sazonais) — tipos e rótulos do admin. */
export const ZONE_TYPE_LABELS: Record<ThemeZoneType, string> = {
  marquee: "Faixa rolante",
  "promo-grid": "Grade promocional",
  "category-band": "Faixa de categorias",
  editorial: "Bloco editorial",
  countdown: "Contagem regressiva",
};

export const ZONE_PLACEMENT_LABELS: Record<ThemeZonePlacement, string> = {
  "after-menu": "Após Menu Buttons",
  "after-destaques": "Após Destaques",
  end: "Fim da Home",
};

/** Tipografias de destaque (2.2) — pilhas CSS sem dependência de fonte externa. */
export const FONT_STACKS: Record<string, string> = {
  bebas: `var(--font-display-face), "Arial Narrow", Impact, sans-serif`,
  condensed: `"Arial Narrow", "Liberation Sans Narrow", var(--font-display-face), Impact, sans-serif`,
  serif: `Georgia, "Times New Roman", serif`,
  mono: `"Courier New", ui-monospace, monospace`,
  system: `system-ui, -apple-system, "Segoe UI", sans-serif`,
};

export const FONT_STACK_LABELS: Record<string, string> = {
  bebas: "Bebas Neue (padrão)",
  condensed: "Condensada",
  serif: "Serifa editorial",
  mono: "Monoespaçada",
  system: "Sistema",
};

export const THEME_KIND_LABELS: Record<ThemeModel["kind"], string> = {
  default: "Default",
  seasonal: "Sazonal",
  festival: "Festival",
  campaign: "Campanha",
  launch: "Lançamento",
  custom: "Custom",
};

export const THEME_PHASE_LABELS: Record<ThemePhase, string> = {
  rascunho: "Rascunho",
  preview: "Preview",
  publicado: "Publicado",
  agendado: "Agendado",
  ativo: "Ativo",
  expirado: "Expirado",
  arquivado: "Arquivado",
};

/** Converte #rgb/#rrggbb em rgba(); outras formas retornam como estão. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  const long = /^#([0-9a-f]{6})$/i.exec(hex);
  if (long) {
    const n = parseInt(long[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  if (short) {
    const [r, g, b] = short[1].split("").map((ch) => parseInt(ch + ch, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

/**
 * Fase do modelo (4.5 ciclo de vida): autoria + derivadas de janela (4.6).
 */
export function themePhase(theme: ThemeModel, now: Date = new Date()): ThemePhase {
  if (theme.status !== "publicado") return theme.status;

  const start = theme.scheduledStart ? Date.parse(theme.scheduledStart) : null;
  const end = theme.scheduledEnd ? Date.parse(theme.scheduledEnd) : null;
  const t = now.getTime();

  if (start !== null && !Number.isNaN(start) && t < start) return "agendado";
  if (end !== null && !Number.isNaN(end) && t > end) return "expirado";
  if ((start !== null && !Number.isNaN(start)) || (end !== null && !Number.isNaN(end))) {
    return "ativo";
  }
  return "publicado";
}

/** true se a janela de agendamento está aberta agora (ou não há janela). */
export function isThemeInWindow(theme: ThemeModel, now: Date = new Date()): boolean {
  const start = theme.scheduledStart ? Date.parse(theme.scheduledStart) : null;
  const end = theme.scheduledEnd ? Date.parse(theme.scheduledEnd) : null;
  const t = now.getTime();
  if (start !== null && !Number.isNaN(start) && t < start) return false;
  if (end !== null && !Number.isNaN(end) && t > end) return false;
  return true;
}

/** Variáveis CSS do modelo (aplicadas em html[data-theme="<key>"]). */
export function themeCssVars(theme: ThemeModel): Record<string, string> {
  const c: ThemeColors = theme.identity.colors;
  const style = theme.identity.borderStyle;

  return {
    "--surface": c.surface,
    "--surface-raised": c.surfaceRaised,
    "--surface-raised-2": c.surfaceRaised2,
    "--text": c.text,
    "--text-muted": c.textMuted,
    "--brand": c.brand,
    "--brand-strong": c.brandStrong,
    "--accent": c.accent,
    "--border": c.border,
    "--header-bg": c.headerBg,
    "--card-radius": style === "editorial" ? "0rem" : theme.identity.cardRadius,
    "--btn-radius": style === "editorial" ? "0rem" : style === "framed" ? "0.375rem" : "0.75rem",
    "--field-radius": style === "editorial" ? "0rem" : style === "framed" ? "0.375rem" : "0.75rem",
    "--glow-brand": withAlpha(c.brand, 0.55),
    "--glow-accent": withAlpha(c.accent, 0.18),
    "--title-gradient": `linear-gradient(100deg, ${c.accent}, ${c.text} 45%, ${c.brandStrong})`,
    "--font-display": FONT_STACKS[theme.identity.displayFont] ?? FONT_STACKS.bebas,
    // fundo livre do body (festivais fora da paleta); vazio = --surface
    "--body-bg": theme.identity.bodyBackground?.trim() || c.surface,
    // tokens Tailwind (@theme) — utilities como text-gold/bg-violet/text-paper
    // passam a seguir a paleta do modelo (no default os valores são idênticos,
    // então nada muda; nos festivais tudo fora da paleta acompanha o tema).
    "--color-gold": c.accent,
    "--color-gold-soft": c.accent,
    "--color-violet": c.brand,
    "--color-violet-soft": c.brandStrong,
    "--color-ink": c.surface,
    "--color-paper": c.text,
  };
}

/**
 * Gera o CSS dos modelos. Seletor `html[data-theme=…]` tem especificidade
 * maior que `:root`, garantindo que o modelo ativo vença os defaults.
 */
export function themeCss(themes: ThemeModel[]): string {
  const blocks: string[] = [];

  for (const theme of themes) {
    const sel = `html[data-theme="${theme.key}"]`;
    const vars = themeCssVars(theme);
    const declarations = Object.entries(vars)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join("\n");

    const rules = [`${sel} {\n${declarations}\n}`];

    if (theme.identity.borderStyle === "framed") {
      rules.push(`${sel} .card { border-width: 2px; }`);
    }

    if (theme.identity.mode === "light") {
      rules.push(`${sel} .logo-white { display: none; }`);
      rules.push(`${sel} .logo-dark { display: block; }`);
    }

    blocks.push(rules.join("\n"));
  }

  return blocks.join("\n");
}
