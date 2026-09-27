import { HOME_SECTION_ORDER } from "@/lib/theme-css";
import type {
  Cover,
  CoverMotif,
  HomeOverride,
  HomeSectionKey,
  LaunchContent,
  LaunchSocial,
  NewsItem,
  ThemeHomeSection,
} from "@/lib/types";

/**
 * §12 — regras dos módulos de Conteúdo do painel (Home §3, Notícias e
 * Lançamentos §20).
 *
 * Fronteiras:
 * - Lançamentos edita só o conteúdo editorial (`LaunchContent`); a
 *   mecânica de pré-venda (`LAUNCH_PREORDER_FIELDS`) continua no módulo
 *   Pré-vendas — os dois escrevem no mesmo documento `launches`.
 * - Home grava uma curadoria (`site/home`) que a página aplica sobre o
 *   padrão visual ativo, sem editar temas (sem módulo de Theme Engine).
 */

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MOTIFS: CoverMotif[] = ["farol", "circuito", "mare", "sal", "recorte"];

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export type FieldParse<T> = { ok: true; item: T } | { ok: false; error: string };

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Lançamentos — conteúdo editorial (§20)
// ---------------------------------------------------------------------------

export interface LaunchContentForm {
  highlight: string;
  coverBg: string;
  coverFg: string;
  coverAccent: string;
  coverMotif: CoverMotif;
  synopsis: string;
  trailerUrl: string;
  socials: LaunchSocial[];
  workId: string;
  universeId: string;
}

export function toLaunchContentForm(content: LaunchContent): LaunchContentForm {
  return {
    highlight: content.highlight,
    coverBg: content.cover.bg,
    coverFg: content.cover.fg,
    coverAccent: content.cover.accent,
    coverMotif: content.cover.motif,
    synopsis: content.synopsis,
    trailerUrl: content.trailerUrl,
    socials: content.socials.map((social) => ({ ...social })),
    workId: content.workId,
    universeId: content.universeId,
  };
}

/** Conteúdo editorial atual de um lançamento (para o formulário). */
export function launchContentOf(launch: {
  highlight?: string;
  cover: Cover;
  synopsis: string;
  trailerUrl?: string;
  socials?: LaunchSocial[];
  workId?: string;
  universeId?: string;
}): LaunchContent {
  return {
    highlight: launch.highlight ?? "",
    cover: { ...launch.cover },
    synopsis: launch.synopsis,
    trailerUrl: launch.trailerUrl ?? "",
    socials: (launch.socials ?? []).map((social) => ({ ...social })),
    workId: launch.workId ?? "",
    universeId: launch.universeId ?? "",
  };
}

export function sanitizeLaunchContent(raw: unknown): FieldParse<LaunchContent> {
  const input = (raw ?? null) as Partial<LaunchContentForm> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados do conteúdo inválidos." };
  }

  const highlight = str(input.highlight);
  if (highlight.length > 120) {
    return { ok: false, error: "O destaque suporta no máximo 120 caracteres." };
  }

  const cover = { bg: str(input.coverBg), fg: str(input.coverFg), accent: str(input.coverAccent) };
  if (!HEX_COLOR.test(cover.bg) || !HEX_COLOR.test(cover.fg) || !HEX_COLOR.test(cover.accent)) {
    return { ok: false, error: "As três cores da arte precisam ser hexadecimais (#rrggbb)." };
  }
  if (!MOTIFS.includes(input.coverMotif as CoverMotif)) {
    return { ok: false, error: "Motivo da arte inválido." };
  }

  const synopsis = str(input.synopsis);
  if (synopsis.length > 5000) {
    return { ok: false, error: "A sinopse suporta no máximo 5000 caracteres." };
  }

  const trailerUrl = str(input.trailerUrl);
  if (trailerUrl) {
    // .mp4/.webm locais (mídia do projeto) ou embeds externos
    const local = trailerUrl.startsWith("/");
    const video = /\.(mp4|webm)(\?|#|$)/i.test(trailerUrl);
    const embed = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(trailerUrl);
    if ((!isHttpUrl(trailerUrl) && !local) || (!video && !embed)) {
      return {
        ok: false,
        error: "O trailer precisa ser um .mp4/.webm ou um link YouTube/Vimeo.",
      };
    }
  }

  const rawSocials = Array.isArray(input.socials) ? input.socials : [];
  if (rawSocials.length > 8) {
    return { ok: false, error: "O lançamento aceita no máximo 8 links sociais." };
  }
  const socials: LaunchSocial[] = [];
  for (const entry of rawSocials) {
    const label = str((entry as Partial<LaunchSocial>)?.label);
    const href = str((entry as Partial<LaunchSocial>)?.href);
    if (!label || !href) {
      return { ok: false, error: "Todo link social precisa de rótulo e URL." };
    }
    if (!isHttpUrl(href)) {
      return { ok: false, error: `Link “${label}” precisa de URL https válida.` };
    }
    socials.push({ label, href });
  }

  return {
    ok: true,
    item: {
      highlight,
      cover: { ...cover, motif: input.coverMotif as CoverMotif },
      synopsis,
      trailerUrl,
      socials,
      workId: str(input.workId),
      universeId: str(input.universeId),
    },
  };
}

// ---------------------------------------------------------------------------
// Home — curadoria (§3)
// ---------------------------------------------------------------------------

export interface HomeForm {
  destaques: string[];
  sections: ThemeHomeSection[];
}

export const BLANK_HOME_FORM: HomeForm = { destaques: [], sections: [] };

export function toHomeForm(override: HomeOverride | null): HomeForm {
  return {
    destaques: [...(override?.destaques ?? [])],
    sections: (override?.sections ?? []).map((section) => ({ ...section })),
  };
}

export function sanitizeHomeInput(raw: unknown): FieldParse<HomeForm> {
  const input = (raw ?? null) as Partial<HomeForm> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados da home inválidos." };
  }

  const destaques = Array.isArray(input.destaques)
    ? [...new Set(input.destaques.filter((id): id is string => typeof id === "string" && id.trim() !== ""))]
    : [];
  if (destaques.length > 10) {
    return { ok: false, error: "Os Destaques aceitam no máximo 10 produtos." };
  }

  const rawSections = Array.isArray(input.sections) ? input.sections : [];
  if (rawSections.length > HOME_SECTION_ORDER.length) {
    return { ok: false, error: "Há mais seções que o permitido pela arquitetura da home." };
  }
  const seen = new Set<HomeSectionKey>();
  const sections: ThemeHomeSection[] = [];
  for (const entry of rawSections) {
    const key = (entry as Partial<ThemeHomeSection>)?.key;
    if (!HOME_SECTION_ORDER.includes(key as HomeSectionKey)) {
      return { ok: false, error: `Seção desconhecida: ${String(key)}.` };
    }
    if (seen.has(key as HomeSectionKey)) {
      return { ok: false, error: `Seção repetida: ${String(key)}.` };
    }
    seen.add(key as HomeSectionKey);
    sections.push({ key: key as HomeSectionKey, enabled: (entry as Partial<ThemeHomeSection>)?.enabled !== false });
  }

  return { ok: true, item: { destaques, sections } };
}

// ---------------------------------------------------------------------------
// Notícias
// ---------------------------------------------------------------------------

export interface NewsForm {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  status: NewsItem["status"];
}

export const BLANK_NEWS_FORM: NewsForm = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  coverImage: "",
  status: "draft",
};

export function toNewsForm(item: NewsItem): NewsForm {
  return {
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    body: item.body,
    coverImage: item.coverImage,
    status: item.status,
  };
}

export function sanitizeNewsInput(raw: unknown, existing: NewsItem | null): FieldParse<NewsItem> {
  const input = (raw ?? null) as Partial<NewsForm> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados da notícia inválidos." };
  }

  const title = str(input.title);
  if (title.length < 3 || title.length > 120) {
    return { ok: false, error: "O título precisa de 3 a 120 caracteres." };
  }

  const slug = slugify(str(input.slug) || title);
  if (!slug) return { ok: false, error: "Não foi possível gerar o slug da notícia." };

  const excerpt = str(input.excerpt);
  if (excerpt.length > 300) {
    return { ok: false, error: "O resumo suporta no máximo 300 caracteres." };
  }

  const body = str(input.body);
  if (body.length < 20 || body.length > 20000) {
    return { ok: false, error: "O texto precisa de 20 a 20000 caracteres." };
  }

  const coverImage = str(input.coverImage);
  if (coverImage && !isHttpUrl(coverImage)) {
    return { ok: false, error: "A imagem de capa precisa ser uma URL https válida." };
  }

  const status = input.status === "published" ? "published" : "draft";
  const now = new Date().toISOString();
  const publishedAt =
    status === "published" ? (existing?.publishedAt ?? now) : (existing?.publishedAt ?? null);

  return {
    ok: true,
    item: {
      id: existing?.id ?? `news-${slug}-${Date.now().toString(36)}`,
      slug,
      title,
      excerpt,
      body,
      coverImage,
      status,
      publishedAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}
