import type { Banner, BannerDestinationType } from "@/lib/types";

/**
 * Regras do módulo Banners (Documento de Correção §5): o banner é uma arte
 * final única enviada por upload — o sistema só controla exibição, destino,
 * ativação, ordenação e agendamento. Módulo puro (sem Firestore), usado pelo
 * painel e pelo renderizador da Home.
 */

export const BANNER_DESTINATION_OPTIONS: { value: BannerDestinationType; label: string }[] = [
  { value: "produto", label: "Produto" },
  { value: "obra", label: "Obra" },
  { value: "colecao", label: "Coleção" },
  { value: "lancamento", label: "Lançamento" },
  { value: "campanha", label: "Campanha" },
  { value: "pagina", label: "Página" },
  { value: "externo", label: "Link externo" },
];

const DESTINATION_TYPES = new Set<string>(BANNER_DESTINATION_OPTIONS.map((o) => o.value));

function isWebUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function isInternalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

/** Rótulo do tipo de destino (lista do painel). */
export function destinationLabel(type: BannerDestinationType): string {
  return BANNER_DESTINATION_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** Monta o href do clique conforme o tipo de destino. */
export function bannerHref(banner: Pick<Banner, "destinationType" | "destinationValue">): string {
  const value = (banner.destinationValue ?? "").trim();
  switch (banner.destinationType) {
    case "produto":
      return `/produtos/${value}`;
    case "obra":
      return `/obras/${value}`;
    case "colecao":
      return "/colecionaveis";
    case "lancamento":
      return `/lancamentos/${value}`;
    case "campanha":
      return value || "/ofertas";
    case "pagina":
      return value || "/";
    case "externo":
      return value;
    default:
      // defesa: doc malformado/legado nunca deve gerar href undefined
      return "/";
  }
}

/** Novo banner para o formulário do painel. */
export function newBannerDraft(): Banner {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    image: "",
    imageMobile: "",
    alt: "",
    destinationType: "produto",
    destinationValue: "",
    order: 0,
    active: true,
    startsAt: undefined,
    endsAt: undefined,
    fullscreen: false,
    showHeader: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Valida e normaliza um banner enviado pelo painel. Retorna null quando os
 * dados obrigatórios estão inválidos (o consumidor responde 400).
 */
export function sanitizeBanner(raw: unknown, id: string): Banner | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const image = typeof data.image === "string" ? data.image.trim() : "";
  const imageMobile = typeof data.imageMobile === "string" ? data.imageMobile.trim() : "";
  const alt = typeof data.alt === "string" ? data.alt.trim() : "";
  const destinationValue =
    typeof data.destinationValue === "string" ? data.destinationValue.trim() : "";
  const destinationType =
    typeof data.destinationType === "string" && DESTINATION_TYPES.has(data.destinationType)
      ? (data.destinationType as BannerDestinationType)
      : null;

  if (!name || name.length > 120) return null;
  if (!image || !(isWebUrl(image) || isInternalPath(image))) return null;
  if (imageMobile && !(isWebUrl(imageMobile) || isInternalPath(imageMobile))) return null;
  if (!alt || alt.length > 300) return null;
  if (!destinationType) return null;

  // Valor do destino conforme o tipo (§5: produto/obra/coleção/lançamento/
  // campanha/página de destino).
  if (destinationType === "produto" || destinationType === "obra" || destinationType === "lancamento") {
    if (!destinationValue || /[\s/]/.test(destinationValue)) return null;
  } else if (destinationType === "externo") {
    if (!isWebUrl(destinationValue)) return null;
  } else if (destinationType === "pagina") {
    if (!isInternalPath(destinationValue)) return null;
  } else if (destinationType === "campanha") {
    if (destinationValue && !isInternalPath(destinationValue)) return null;
  }
  // colecao: valor opcional (o clique abre /colecionaveis).

  const order =
    typeof data.order === "number" && Number.isFinite(data.order)
      ? Math.max(0, Math.floor(data.order))
      : 0;

  const startsAt =
    typeof data.startsAt === "string" && data.startsAt.trim()
      ? data.startsAt.trim()
      : undefined;
  const endsAt = typeof data.endsAt === "string" && data.endsAt.trim() ? data.endsAt.trim() : undefined;
  if (startsAt && Number.isNaN(Date.parse(startsAt))) return null;
  if (endsAt && Number.isNaN(Date.parse(endsAt))) return null;
  if (startsAt && endsAt && Date.parse(startsAt) >= Date.parse(endsAt)) return null;

  const now = new Date().toISOString();
  return {
    id,
    name,
    image,
    imageMobile: imageMobile || undefined,
    alt,
    destinationType,
    destinationValue: destinationType === "campanha" && !destinationValue ? "/ofertas" : destinationValue,
    order,
    active: data.active !== false,
    startsAt,
    endsAt,
    fullscreen: data.fullscreen === true,
    showHeader: data.showHeader !== false,
    createdAt: typeof data.createdAt === "string" && data.createdAt ? data.createdAt : now,
    updatedAt: now,
  };
}

/** ISO → valor de input datetime-local no fuso local. */
export function datetimeToInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Input datetime-local → ISO (undefined quando vazio). */
export function inputToDatetime(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
