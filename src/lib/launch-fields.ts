import { ID_PATTERN, slugify } from "@/lib/catalog-fields";
import type { Cover, Launch, LaunchLot } from "@/lib/types";

/**
 * §15 — campos de pré-venda do módulo Pré-vendas (§12): data de lançamento,
 * countdown, lotes, estoque/produtos exclusivos, notificação e previsão de
 * envio. Módulo puro (client + server): o formulário valida com as mesmas
 * funções que a API executa.
 *
 * A edição preserva o restante do lançamento (arte, sinopse, trailer e
 * redes sociais) — esse conteúdo pertence ao módulo Lançamentos (§20).
 */

export const LAUNCH_PREORDER_FIELDS = [
  "title",
  "slug",
  "preOrder",
  "releaseDate",
  "shipForecast",
  "notifyOnRelease",
  "lots",
  "productIds",
] as const;

export type LaunchPreorderField = (typeof LAUNCH_PREORDER_FIELDS)[number];

/** Capa padrão enquanto o módulo Lançamentos (§20) não define a arte. */
export const DEFAULT_LAUNCH_COVER: Cover = {
  bg: "#0C0014",
  fg: "#F8FEFF",
  accent: "#FDC500",
  motif: "farol",
};

export type SanitizeResult =
  | { ok: true; launch: Launch }
  | { ok: false; error: string };

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** ISO → valor de `<input type="datetime-local">` no fuso local. */
export function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor de `<input type="date">` a partir de uma data ISO. */
export function toLocalDate(iso?: string): string {
  return toLocalInput(iso).slice(0, 10);
}

/** Valor do formulário → ISO (undefined quando vazio/inválido). */
export function toIso(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function sanitizeLots(raw: unknown): { ok: true; lots: LaunchLot[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, lots: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "Lotes inválidos." };
  if (raw.length > 12) return { ok: false, error: "Máximo de 12 lotes por pré-venda." };

  const lots: LaunchLot[] = [];
  for (const entry of raw) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const name = str(item.name);
    if (!name) return { ok: false, error: "Todo lote precisa de um nome." };
    if (name.length > 60) return { ok: false, error: `Nome do lote muito longo: ${name}.` };

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return { ok: false, error: `Quantidade inválida no lote ${name} — use um inteiro maior que zero.` };
    }

    const lot: LaunchLot = { name, qty };

    if (item.price !== undefined && item.price !== null && item.price !== "") {
      const price = Number(item.price);
      if (!Number.isFinite(price) || price < 0) {
        return { ok: false, error: `Preço inválido no lote ${name}.` };
      }
      lot.price = price;
    }

    const closesAt = toIso(str(item.closesAt));
    if (item.closesAt && !closesAt) {
      return { ok: false, error: `Data de encerramento inválida no lote ${name}.` };
    }
    if (closesAt) lot.closesAt = closesAt;

    lots.push(lot);
  }
  return { ok: true, lots };
}

/**
 * Valida o formulário da pré-venda e devolve o documento completo.
 * `existing` preserva id, createdAt, capa, sinopse e demais campos
 * editoriais (§20) — a pré-venda só escreve os campos §15.
 */
export function sanitizeLaunchInput(raw: unknown, existing: Launch | null): SanitizeResult {
  const input = (raw ?? {}) as Record<string, unknown>;

  const title = str(input.title);
  if (title.length < 2) return { ok: false, error: "Título do lançamento é obrigatório." };
  if (title.length > 80) return { ok: false, error: "Título muito longo (máximo de 80 caracteres)." };

  const slug = slugify(str(input.slug) || title);
  if (!ID_PATTERN.test(slug)) {
    return { ok: false, error: "Slug inválido — use letras minúsculas, números e hífens." };
  }

  const releaseDate = toIso(str(input.releaseDate));
  if (!releaseDate) {
    return { ok: false, error: "Informe a data e a hora do lançamento (countdown)." };
  }

  const shipForecastRaw = str(input.shipForecast);
  const shipForecast = shipForecastRaw ? toIso(`${shipForecastRaw}T12:00:00`) : undefined;
  if (shipForecastRaw && !shipForecast) {
    return { ok: false, error: "Previsão de envio inválida." };
  }

  const productIds = Array.isArray(input.productIds)
    ? [...new Set(input.productIds.map((id) => str(id)).filter((id) => ID_PATTERN.test(id)))]
    : [];

  const lotsResult = sanitizeLots(input.lots);
  if (!lotsResult.ok) return { ok: false, error: lotsResult.error };

  const base = existing ?? null;

  const launch: Launch = {
    ...(base ?? {}),
    id: base?.id ?? `lch-${slug}`,
    title,
    slug,
    preOrder: bool(input.preOrder, base?.preOrder ?? false),
    releaseDate,
    notifyOnRelease: bool(input.notifyOnRelease, base?.notifyOnRelease ?? false),
    productIds,
    lots: lotsResult.lots,
    cover: base?.cover ?? DEFAULT_LAUNCH_COVER,
    synopsis: base?.synopsis ?? "",
    createdAt: base?.createdAt ?? new Date().toISOString(),
  };

  if (shipForecast) launch.shipForecast = shipForecast;
  else delete launch.shipForecast;

  return { ok: true, launch };
}

/** Formulário preenchido a partir do documento (strings para os inputs). */
export interface LaunchFormState {
  id: string;
  title: string;
  slug: string;
  preOrder: boolean;
  releaseDate: string;
  shipForecast: string;
  notifyOnRelease: boolean;
  productIds: string[];
  lots: LaunchLot[];
}

export function toLaunchForm(launch: Launch): LaunchFormState {
  return {
    id: launch.id,
    title: launch.title,
    slug: launch.slug,
    preOrder: Boolean(launch.preOrder),
    releaseDate: toLocalInput(launch.releaseDate),
    shipForecast: toLocalDate(launch.shipForecast),
    notifyOnRelease: Boolean(launch.notifyOnRelease),
    productIds: Array.isArray(launch.productIds) ? [...launch.productIds] : [],
    lots: Array.isArray(launch.lots) ? launch.lots.map((lot) => ({ ...lot })) : [],
  };
}

export const BLANK_LAUNCH_FORM: LaunchFormState = {
  id: "",
  title: "",
  slug: "",
  preOrder: true,
  releaseDate: "",
  shipForecast: "",
  notifyOnRelease: false,
  productIds: [],
  lots: [],
};
