/**
 * §34 — QR Codes no admin: gerenciar QR Codes associados a conteúdos,
 * conectando produtos físicos ao conteúdo digital da loja.
 *
 * Tipos puros (client-safe). O QR aponta para o endereço público da loja
 * (`qrShareUrl`) — obra/produto/audiobook vêm do catálogo, os demais
 * alvos são caminhos editoriais informados pelo painel.
 */

export const QR_TARGET_TYPES = [
  "obra",
  "produto",
  "audiobook",
  "capitulo-bonus",
  "making-of",
  "arte",
  "wallpaper",
  "soundtrack",
  "conteudo-extra",
  "certificado",
  "evento",
] as const;

export type QrTargetType = (typeof QR_TARGET_TYPES)[number];

export const QR_TARGET_LABELS: Record<QrTargetType, string> = {
  obra: "Obra",
  produto: "Produto",
  audiobook: "Audiobook",
  "capitulo-bonus": "Capítulo bônus",
  "making-of": "Making-of",
  arte: "Arte",
  wallpaper: "Wallpaper",
  soundtrack: "Soundtrack",
  "conteudo-extra": "Conteúdo extra",
  certificado: "Certificado de autenticidade",
  evento: "Evento",
};

/** Alvos escolhidos no catálogo (obra/produto físico/audiobook). */
export const QR_CATALOG_TYPES: QrTargetType[] = ["obra", "produto", "audiobook"];

export const QR_SITE_ORIGIN = "https://www.cliffhangerstore.xyz";

/** Endereço completo que o QR Code carrega. */
export function qrShareUrl(target: string): string {
  if (!target) return QR_SITE_ORIGIN;
  if (/^https?:\/\//i.test(target)) return target;
  return `${QR_SITE_ORIGIN}${target.startsWith("/") ? "" : "/"}${target}`;
}

export interface QrCodeEntry {
  id: string;
  label: string;
  type: QrTargetType;
  /** caminho ("/obras/…") ou URL http(s) */
  target: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Alvo do catálogo oferecido ao criar um QR (obra/produto/audiobook). */
export interface QrCatalogOption {
  id: string;
  slug: string;
  title: string;
  type?: string;
  digital?: boolean;
}

export type QrFieldParse<T> = { ok: true; item: T } | { ok: false; error: string };

/** Leitura defensiva de um documento gravado pelo painel. */
export function normalizeQrEntry(id: string, raw: unknown): QrCodeEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<QrCodeEntry>;
  const label = typeof data.label === "string" ? data.label.trim().slice(0, 120) : "";
  const target = typeof data.target === "string" ? data.target.trim().slice(0, 300) : "";
  if (!label || !target) return null;
  return {
    id,
    label,
    type: QR_TARGET_TYPES.includes(data.type as QrTargetType)
      ? (data.type as QrTargetType)
      : "conteudo-extra",
    target,
    active: data.active !== false,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

export interface QrForm {
  label: string;
  type: QrTargetType;
  target: string;
  active: boolean;
}

export function blankQrForm(): QrForm {
  return { label: "", type: "obra", target: "", active: true };
}

export function toQrForm(entry: QrCodeEntry): QrForm {
  return { label: entry.label, type: entry.type, target: entry.target, active: entry.active };
}

function isValidTarget(value: string): boolean {
  return /^\/[^\s]*$/.test(value) || /^https?:\/\/[^\s]+$/i.test(value);
}

export function sanitizeQrInput(
  raw: unknown,
  existing?: { id: string; createdAt?: string } | null,
): QrFieldParse<QrCodeEntry> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Dados do QR Code inválidos." };
  }
  const incomingId = typeof (raw as { id?: unknown }).id === "string"
    ? (raw as { id: string }).id.trim()
    : "";
  if (incomingId && existing?.id && incomingId !== existing.id) {
    return { ok: false, error: "O id do QR Code não pode ser alterado." };
  }
  const form = raw as Partial<QrForm>;
  const label = String(form.label ?? "").trim().slice(0, 120);
  if (!label) return { ok: false, error: "Informe um nome para o QR Code." };

  const type: QrTargetType = QR_TARGET_TYPES.includes(form.type as QrTargetType)
    ? (form.type as QrTargetType)
    : "obra";
  const target = String(form.target ?? "").trim().slice(0, 300);
  if (!target) return { ok: false, error: "Informe o destino do QR Code." };
  if (!isValidTarget(target)) {
    return { ok: false, error: "Destino inválido — use um caminho (começando com /) ou URL http(s)." };
  }

  const now = new Date().toISOString();
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const id = existing?.id ?? `qr-${slug || "codigo"}-${Date.now().toString(36)}`;

  return {
    ok: true,
    item: {
      id,
      label,
      type,
      target,
      active: form.active !== false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
  };
}
