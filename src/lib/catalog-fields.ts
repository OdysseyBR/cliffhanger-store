import { COVER_MOTIF_OPTIONS, productSlug } from "@/lib/product-fields";
import type {
  Author,
  Category,
  CategoryType,
  Collection,
  Cover,
  Universe,
  Work,
} from "@/lib/types";

/**
 * §12 — grupo Catálogo do painel: Obras, Universos, Autores, Categorias e
 * Coleções. Constantes, validação e rótulos dos 5 módulos.
 *
 * Módulo puro (client + server): o formulário valida com os mesmos
 * `sanitize*` usados pelas APIs de escrita, e os metadados alimentam a
 * listagem, a auditoria (§13) e as rotas dinâmicas.
 */

export const CATALOG_ENTITIES = [
  "works",
  "universes",
  "authors",
  "categories",
  "collections",
] as const;

export type CatalogEntity = (typeof CATALOG_ENTITIES)[number];

export const CATALOG_TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: "fisico", label: "Físico" },
  { value: "digital", label: "Digital" },
  { value: "hibrido", label: "Híbrido (livro + e-book)" },
];

export interface CatalogEntityMeta {
  /** coleção no Firestore */
  collection: string;
  /** rótulo do módulo no painel (§12) — também usado na auditoria */
  label: string;
  /** substantivo singular (ex.: "obra") — resumos da auditoria (§13) */
  noun: string;
  /** entidade registrada na auditoria (§13) */
  entity: string;
  /** prefixo de id gerado na criação (ex.: wkb-) */
  prefix: string;
  /** campo de ordenação da listagem */
  sortField: "title" | "name" | "sort";
  /** rótulos de campo usados no resumo do que mudou (auditoria) */
  fields: Record<string, string>;
  /** rótulo do que ainda referencia o registro (bloqueio de exclusão) */
  refs: { collection: string; field: string; label: string }[];
}

export const CATALOG_META: Record<CatalogEntity, CatalogEntityMeta> = {
  works: {
    collection: "works",
    label: "Obras",
    noun: "obra",
    entity: "work",
    prefix: "wkb",
    sortField: "title",
    fields: {
      title: "título",
      subtitle: "subtítulo",
      slug: "slug",
      authorId: "autor",
      universeId: "universo",
      synopsis: "sinopse",
      year: "ano",
      seriesIndex: "nº da série",
      seriesName: "série",
      cover: "capa",
    },
    refs: [
      { collection: "products", field: "workId", label: "produto" },
      { collection: "launches", field: "workId", label: "lançamento" },
    ],
  },
  universes: {
    collection: "universes",
    label: "Universos",
    noun: "universo",
    entity: "universe",
    prefix: "uni",
    sortField: "name",
    fields: {
      name: "nome",
      slug: "slug",
      tagline: "linha de destaque",
      description: "descrição",
      cover: "capa",
    },
    refs: [
      { collection: "products", field: "universeId", label: "produto" },
      { collection: "works", field: "universeId", label: "obra" },
      { collection: "launches", field: "universeId", label: "lançamento" },
    ],
  },
  authors: {
    collection: "authors",
    label: "Autores",
    noun: "autor",
    entity: "author",
    prefix: "aut",
    sortField: "name",
    fields: { name: "nome", slug: "slug", role: "função", bio: "texto" },
    refs: [
      { collection: "products", field: "authorId", label: "produto" },
      { collection: "works", field: "authorId", label: "obra" },
    ],
  },
  categories: {
    collection: "categories",
    label: "Categorias",
    noun: "categoria",
    entity: "category",
    prefix: "",
    sortField: "sort",
    fields: {
      name: "nome",
      slug: "slug",
      typeId: "tipo",
      description: "descrição",
      image: "imagem",
      sort: "ordem",
    },
    // o valor usado em `products.category` é o slug da categoria
    refs: [],
  },
  collections: {
    collection: "collections",
    label: "Coleções",
    noun: "coleção",
    entity: "collection",
    prefix: "col",
    sortField: "title",
    fields: {
      title: "título",
      slug: "slug",
      description: "descrição",
      productIds: "produtos",
    },
    refs: [],
  },
};

export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** slug URL-friendly (sem acento, minúsculo, hífens simples). */
export function slugify(raw: string): string {
  return productSlug(raw);
}

/** Entidade válida vinda da URL (`/api/admin/catalog/[entity]`). */
export function isCatalogEntity(value: string): value is CatalogEntity {
  return (CATALOG_ENTITIES as readonly string[]).includes(value);
}

const DEFAULT_COVER: Cover = {
  bg: "#0C0014",
  fg: "#F8FEFF",
  accent: "#FDC500",
  motif: "farol",
};

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Leitura defensiva de texto do Firestore (documentos legados). */
export function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Leitura defensiva de número do Firestore (documentos legados). */
export function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * Capa procedural (§5): aceita a arte enviada quando as cores e o motivo
 * são válidos e cai na capa padrão da marca no restante — a arte nunca
 * derruba o cadastro nem a página pública que a exibe.
 */
function readCover(value: unknown): Cover {
  if (!value || typeof value !== "object") return { ...DEFAULT_COVER };
  const raw = value as Partial<Cover>;
  const bg = str(raw.bg);
  const fg = str(raw.fg);
  const accent = str(raw.accent);
  const motif = raw.motif;
  const validMotif = COVER_MOTIF_OPTIONS.some((option) => option.value === motif);
  if (!validMotif || !HEX_COLOR.test(bg) || !HEX_COLOR.test(fg) || !HEX_COLOR.test(accent)) {
    return { ...DEFAULT_COVER };
  }
  return { bg, fg, accent, motif: raw.motif as Cover["motif"] };
}

/** URL de imagem aceita: caminho interno (/…) ou http(s)://… — ou vazio. */
function readImage(value: unknown): string | null {
  const image = str(value);
  if (!image) return "";
  if (image.startsWith("/") || image.startsWith("#")) return image;
  if (/^https?:\/\/\S+$/i.test(image)) return image;
  return null;
}

/** Valida uma obra (Universo → Obra → Produtos, seção 5.1). */
export function sanitizeWork(input: unknown): Work | null {
  if (!input || typeof input !== "object") return null;
  const w = input as Record<string, unknown>;

  const title = str(w.title);
  const slug = str(w.slug) || slugify(title);
  const authorId = str(w.authorId);
  const universeId = str(w.universeId);
  const year = num(w.year);
  if (!title || !ID_PATTERN.test(slug) || !authorId || !universeId) return null;
  if (year === null || year < 1000 || year > 3000) return null;

  const seriesIndexRaw = num(w.seriesIndex);
  const seriesIndex =
    seriesIndexRaw !== null && seriesIndexRaw >= 1 ? Math.round(seriesIndexRaw) : undefined;

  return {
    id: str(w.id),
    slug,
    title,
    subtitle: str(w.subtitle) || undefined,
    authorId,
    universeId,
    synopsis: str(w.synopsis),
    year: Math.round(year),
    seriesIndex,
    seriesName: str(w.seriesName) || undefined,
    cover: readCover(w.cover),
    createdAt: str(w.createdAt) || new Date().toISOString(),
  };
}

/** Valida um universo (seção 5.1 — agrupa obras e produtos). */
export function sanitizeUniverse(input: unknown): Universe | null {
  if (!input || typeof input !== "object") return null;
  const u = input as Record<string, unknown>;

  const name = str(u.name);
  const slug = str(u.slug) || slugify(name);
  if (!name || !ID_PATTERN.test(slug)) return null;

  return {
    id: str(u.id),
    slug,
    name,
    tagline: str(u.tagline),
    description: str(u.description),
    cover: readCover(u.cover),
    createdAt: str(u.createdAt) || new Date().toISOString(),
  };
}

/** Valida um autor/criação do catálogo editorial. */
export function sanitizeAuthor(input: unknown): Author | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Record<string, unknown>;

  const name = str(a.name);
  const slug = str(a.slug) || slugify(name);
  if (!name || !ID_PATTERN.test(slug)) return null;

  return {
    id: str(a.id),
    slug,
    name,
    role: str(a.role),
    bio: str(a.bio),
    createdAt: str(a.createdAt) || new Date().toISOString(),
  };
}

/** Valida uma categoria de produto (§12 — módulo Categorias). */
export function sanitizeCategory(input: unknown): Category | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;

  const name = str(c.name);
  const slug = str(c.slug) || slugify(name);
  const image = readImage(c.image);
  const sort = num(c.sort) ?? 0;
  const typeId = str(c.typeId) as CategoryType;
  if (!name || !ID_PATTERN.test(slug) || image === null) return null;
  if (!CATALOG_TYPE_OPTIONS.some((option) => option.value === typeId)) return null;

  return {
    id: str(c.id),
    slug,
    name,
    typeId,
    description: str(c.description),
    image,
    sort: Math.max(0, Math.round(sort)),
    createdAt: str(c.createdAt) || new Date().toISOString(),
  };
}

/** Valida uma coleção curada (lista de produtos publicada na loja). */
export function sanitizeCollection(input: unknown): Collection | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;

  const title = str(c.title);
  const slug = str(c.slug) || slugify(title);
  if (!title || !ID_PATTERN.test(slug)) return null;

  const productIds = Array.isArray(c.productIds)
    ? [...new Set(c.productIds.map((id) => str(id)).filter((id) => ID_PATTERN.test(id)))]
    : [];

  return {
    id: str(c.id),
    slug,
    title,
    description: str(c.description),
    productIds,
    createdAt: str(c.createdAt) || new Date().toISOString(),
  };
}

/** Sanitizador da entidade (null = dados inválidos → a API responde 400). */
export function sanitizeCatalogItem(
  entity: CatalogEntity,
  raw: unknown,
): Work | Universe | Author | Category | Collection | null {
  switch (entity) {
    case "works":
      return sanitizeWork(raw);
    case "universes":
      return sanitizeUniverse(raw);
    case "authors":
      return sanitizeAuthor(raw);
    case "categories":
      return sanitizeCategory(raw);
    case "collections":
      return sanitizeCollection(raw);
    default:
      return null;
  }
}
