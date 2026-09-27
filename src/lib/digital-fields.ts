import type { Chapter, DigitalFile, DigitalKind, Product } from "@/lib/types";

/**
 * §8/§12 — regras dos módulos digitais do painel (E-books e Audiobooks).
 *
 * Cada módulo edita o conteúdo digital de um produto `type === "ebook"`
 * (arquivos PDF) ou `type === "audiobook"` (arquivos de áudio): os
 * arquivos entregues na biblioteca do cliente, o download quando
 * permitido (controle de licença §8) e o sumário de capítulos do
 * leitor/player.
 *
 * Os campos moram em `products` — a mesma fonte que alimenta o leitor
 * público (`/biblioteca/leitor`) e o player (`/biblioteca/audiobook`).
 * A edição comum de Produtos não mexe neles: `sanitizeProduct`
 * propaga `files`/`chapters` como estão, então gravar por aqui não
 * briga com o módulo Produtos.
 */

/** Qual tipo de arquivo o módulo gerencia (e-book = pdf, audiobook = áudio). */
export type DigitalModuleKind = Extract<DigitalKind, "pdf" | "audio">;

/** `Product.type` correspondente a cada módulo. */
export const DIGITAL_PRODUCT_TYPE: Record<DigitalModuleKind, Product["type"]> = {
  pdf: "ebook",
  audio: "audiobook",
};

/** Nome do módulo (usado em auditoria §13 e na navegação §12). */
export const DIGITAL_MODULE_LABEL: Record<DigitalModuleKind, string> = {
  pdf: "E-books",
  audio: "Audiobooks",
};

/** Estado de edição do conteúdo digital de um produto. */
export interface DigitalFormState {
  /** §8 — o item é entregue na biblioteca do cliente? */
  digital: boolean;
  files: DigitalFile[];
  chapters: Chapter[];
}

/** Preenche o formulário do painel a partir do produto. */
export function toDigitalForm(product: Product): DigitalFormState {
  return {
    digital: product.digital === true,
    files: (product.files ?? []).map((file) => ({ ...file })),
    chapters: (product.chapters ?? []).map((chapter) => ({ ...chapter })),
  };
}

export type DigitalParse =
  | { ok: true; form: DigitalFormState }
  | { ok: false; error: string };

const MAX_FILES = 3;
const MAX_CHAPTERS = 200;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isFileUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

/**
 * Valida o payload do painel. Só entram arquivos do tipo do módulo:
 * o leitor público abre PDFs e o player abre áudio, então um e-book não
 * pode receber áudio (nem o contrário).
 */
export function sanitizeDigitalInput(raw: unknown, kind: DigitalModuleKind): DigitalParse {
  const input = (raw ?? null) as Partial<DigitalFormState> | null;
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Dados digitais inválidos." };
  }

  const rawFiles = Array.isArray(input.files) ? input.files : [];
  if (rawFiles.length > MAX_FILES) {
    return { ok: false, error: `Um produto aceita no máximo ${MAX_FILES} arquivos digitais.` };
  }

  const files: DigitalFile[] = [];
  for (const entry of rawFiles) {
    const file = (entry ?? null) as Partial<DigitalFile> | null;
    const url = str(file?.url);
    const name = str(file?.name);
    if (!url || !isFileUrl(url)) {
      return {
        ok: false,
        error: "Cada arquivo precisa de uma URL válida (https://… ou caminho iniciado em /).",
      };
    }
    if (!name) {
      return { ok: false, error: "Cada arquivo precisa de um nome exibido ao cliente." };
    }
    if (file?.kind !== kind) {
      return {
        ok: false,
        error:
          kind === "pdf"
            ? "Neste módulo só entram arquivos PDF — áudio é gerenciado em Audiobooks."
            : "Neste módulo só entram arquivos de áudio — PDF é gerenciado em E-books.",
      };
    }
    files.push({ kind, url, name, allowDownload: file.allowDownload !== false });
  }

  const rawChapters = Array.isArray(input.chapters) ? input.chapters : [];
  if (rawChapters.length > MAX_CHAPTERS) {
    return { ok: false, error: `O sumário aceita no máximo ${MAX_CHAPTERS} capítulos.` };
  }

  const chapters: Chapter[] = [];
  for (const entry of rawChapters) {
    const chapter = (entry ?? null) as Partial<Chapter> | null;
    const title = str(chapter?.title);
    const start = num(chapter?.start);
    // `start` é número: página do e-book ou segundo do audiobook (§8 usa
    // frações de segundo — ex.: 22.67). Normaliza em 2 casas, sem truncar.
    if (!title) return { ok: false, error: "Todo capítulo precisa de um título." };
    if (start === null || start < 0) {
      return {
        ok: false,
        error: `Capítulo “${title}”: ${
          kind === "pdf" ? "a página inicial" : "o início em segundos"
        } precisa ser um número (0 ou maior).`,
      };
    }
    chapters.push({ title, start: Math.round(start * 100) / 100 });
  }
  chapters.sort((a, b) => a.start - b.start);

  return { ok: true, form: { digital: input.digital === true, files, chapters } };
}

/** Resumo legível do conteúdo digital (auditoria §13 e listas do painel). */
export function describeDigital(form: DigitalFormState): string {
  const bits: string[] = [];
  bits.push(
    form.files.length === 0
      ? "sem arquivo"
      : `${form.files.length} arquivo(s): ${form.files.map((file) => file.name).join(", ")}`,
  );
  bits.push(`${form.chapters.length} capítulo(s)`);
  bits.push(form.files.some((file) => file.allowDownload) ? "download liberado" : "download bloqueado");
  bits.push(form.digital ? "entrega digital ativa" : "entrega digital inativa");
  return bits.join(" · ");
}
