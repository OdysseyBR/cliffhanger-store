import type {
  Badge,
  Chapter,
  Cover,
  CoverMotif,
  DigitalFile,
  Product,
  ProductCategory,
  ProductType,
  Spec,
} from "@/lib/types";

/**
 * Constantes e validação do criador de itens (Doc Mestre 11.2 —
 * cadastro de produtos: literatura e merchandising).
 * Módulo puro (client + server): usado pelo formulário do painel e
 * pelas APIs de escrita.
 */

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "livro-fisico", label: "Livro físico" },
  { value: "hq", label: "HQ" },
  { value: "artbook", label: "Artbook" },
  { value: "ebook", label: "E-book" },
  { value: "audiobook", label: "Audiobook" },
  { value: "camisa", label: "Camisa" },
  { value: "caneca", label: "Caneca" },
  { value: "poster", label: "Pôster" },
  { value: "marcador", label: "Marcador" },
  { value: "adesivo", label: "Adesivos" },
  { value: "print", label: "Print" },
  { value: "box", label: "Box" },
  { value: "colecionavel", label: "Colecionável" },
];

export const PRODUCT_CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "livros", label: "Livros" },
  { value: "ebooks", label: "E-books" },
  { value: "audiobooks", label: "Audiobooks" },
  { value: "produtos", label: "Produtos" },
  { value: "colecionaveis", label: "Colecionáveis" },
];

/** Badges previstos (Doc Mestre 2.3 — lista fechada de10). */
export const BADGE_OPTIONS: { value: Badge | ""; label: string }[] = [
  { value: "", label: "Sem badge" },
  { value: "NOVO", label: "NOVO" },
  { value: "LANÇAMENTO", label: "LANÇAMENTO" },
  { value: "PRÉ-VENDA", label: "PRÉ-VENDA" },
  { value: "EXCLUSIVO", label: "EXCLUSIVO" },
  { value: "LIMITADO", label: "LIMITADO" },
  { value: "BEST-SELLER", label: "BEST-SELLER" },
  { value: "ESGOTANDO", label: "ESGOTANDO" },
  { value: "OFERTA", label: "OFERTA" },
  { value: "DIGITAL", label: "DIGITAL" },
  { value: "EDIÇÃO ESPECIAL", label: "EDIÇÃO ESPECIAL" },
];

export const COVER_MOTIF_OPTIONS: { value: CoverMotif; label: string }[] = [
  { value: "farol", label: "Farol" },
  { value: "circuito", label: "Circuito" },
  { value: "mare", label: "Maré" },
  { value: "sal", label: "Sal" },
  { value: "recorte", label: "Recorte" },
];

/** Categoria sugerida ao escolher o tipo (seção 5.2) — o usuário pode mudar. */
export const TYPE_CATEGORY: Record<ProductType, ProductCategory> = {
  "livro-fisico": "livros",
  hq: "livros",
  artbook: "livros",
  ebook: "ebooks",
  audiobook: "audiobooks",
  camisa: "produtos",
  caneca: "produtos",
  poster: "produtos",
  marcador: "produtos",
  adesivo: "produtos",
  print: "produtos",
  box: "colecionaveis",
  colecionavel: "colecionaveis",
};

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

/** slug URL-friendly (mesma regra do painel: sem acento, minúsculo). */
export function productSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rascilho padrão para um item novo. */
export function newProductDraft(): Product {
  return {
    id: "",
    slug: "",
    title: "",
    type: "livro-fisico",
    category: "livros",
    price: 0,
    rating: 0,
    reviewCount: 0,
    stock: 0,
    digital: false,
    description: "",
    specs: [],
    createdAt: new Date().toISOString(),
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * Valida e normaliza um produto enviado pelo painel. Retorna null quando
 * os dados obrigatórios estão inválidos (a API responde400 nesse caso).
 * Campos opcionais só entram quando passam na checagem (ex.: capa com
 * cor inválida cai no arte procedural padrão).
 */
export function sanitizeProduct(input: unknown): Product | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;

  const id = str(p.id);
  const slug = str(p.slug);
  const title = str(p.title);
  if (!ID_PATTERN.test(id) || !ID_PATTERN.test(slug) || !title) return null;

  const type = str(p.type) as ProductType;
  if (!PRODUCT_TYPE_OPTIONS.some((option) => option.value === type)) return null;
  const category = str(p.category) as ProductCategory;
  if (!PRODUCT_CATEGORY_OPTIONS.some((option) => option.value === category)) return null;

  const price = num(p.price);
  if (price === null || price < 0) return null;

  // Preço "de" só faz sentido acima do preço atual; abaixo é descartado.
  const compareAtRaw = num(p.compareAt);
  const compareAt = compareAtRaw !== null && compareAtRaw > price ? compareAtRaw : undefined;

  const badgeStr = str(p.badge);
  const badge =
    badgeStr && BADGE_OPTIONS.some((option) => option.value === badgeStr)
      ? (badgeStr as Badge)
      : undefined;

  const rating = num(p.rating);
  if (rating === null || rating < 0 || rating > 5) return null;
  const reviewCount = num(p.reviewCount);
  if (reviewCount === null || reviewCount < 0) return null;
  const stock = num(p.stock);
  if (stock === null || stock < 0) return null;

  const specs: Spec[] = Array.isArray(p.specs)
    ? p.specs
        .map((entry) => {
          const spec = entry as Partial<Spec> | null;
          return { label: str(spec?.label), value: str(spec?.value) };
        })
        .filter((spec) => spec.label && spec.value)
    : [];

  let cover: Cover | undefined;
  const coverRaw = p.cover as Partial<Cover> | null | undefined;
  if (coverRaw && typeof coverRaw === "object") {
    const bg = str(coverRaw.bg);
    const fg = str(coverRaw.fg);
    const accent = str(coverRaw.accent);
    const motif = coverRaw.motif;
    if (
      motif &&
      HEX_COLOR.test(bg) &&
      HEX_COLOR.test(fg) &&
      HEX_COLOR.test(accent) &&
      COVER_MOTIF_OPTIONS.some((option) => option.value === motif)
    ) {
      cover = { bg, fg, accent, motif };
    }
  }

  const releaseStr = str(p.releaseDate);
  let releaseDate: string | undefined;
  if (releaseStr) {
    const date = new Date(releaseStr);
    releaseDate = Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  const salesRankRaw = num(p.salesRank);
  const salesRank =
    salesRankRaw !== null && salesRankRaw >= 1 ? Math.round(salesRankRaw) : undefined;

  // §8 — arquivos digitais e sumário precisam SOBREVIVER à edição no
  // painel: sem eles o item sairia da biblioteca do cliente. O editor de
  // produto não altera esses campos, então eles são validados e
  // propagados como estão (sem eles, cada gravação apagaria o e-book/
  // audiobook cadastrado na plataforma digital).
  const files: DigitalFile[] = Array.isArray(p.files)
    ? p.files
        .map((entry) => {
          const file = entry as Partial<DigitalFile> | null;
          const kind = str(file?.kind);
          const url = str(file?.url);
          if ((kind === "pdf" || kind === "audio") && url) {
            return {
              kind,
              url,
              name: str(file?.name) || (kind === "pdf" ? "Arquivo PDF" : "Áudio"),
              allowDownload: file?.allowDownload !== false,
            } satisfies DigitalFile;
          }
          return null;
        })
        .filter((file): file is DigitalFile => file !== null)
    : [];

  const chapters: Chapter[] = Array.isArray(p.chapters)
    ? p.chapters
        .map((entry) => {
          const chapter = entry as Partial<Chapter> | null;
          const title = str(chapter?.title);
          const start = num(chapter?.start);
          return title && start !== null && start >= 0
            ? { title, start: Math.round(start) }
            : null;
        })
        .filter((chapter): chapter is Chapter => chapter !== null)
    : [];

  return {
    id,
    slug,
    title,
    type,
    category,
    price,
    compareAt,
    badge,
    rating,
    reviewCount: Math.round(reviewCount),
    stock: Math.round(stock),
    digital: p.digital === true,
    workId: str(p.workId) || undefined,
    universeId: str(p.universeId) || undefined,
    authorId: str(p.authorId) || undefined,
    description: typeof p.description === "string" ? p.description.trim() : "",
    specs,
    cover,
    releaseDate,
    salesRank,
    createdAt: str(p.createdAt) || new Date().toISOString(),
    ...(files.length > 0 ? { files } : {}),
    ...(chapters.length > 0 ? { chapters } : {}),
  };
}
