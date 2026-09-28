/**
 * §33 — Aplicativo no admin: conteúdos específicos do app, gravados em
 * `site/app`. O app tem autonomia visual e funcional própria (§33): este
 * módulo administra o editorial dele — destaques, eventos, conteúdos
 * extras, scanner e experiências — sem tratar o app como versão menor do
 * site. Notificações continuam no módulo Notificações (§16).
 *
 * Tipos puros (client-safe); a persistência fica em `/api/admin/app`.
 */

export type AppExtraKind =
  | "making-of"
  | "arte"
  | "wallpaper"
  | "soundtrack"
  | "video"
  | "bastidores";

export const APP_EXTRA_KINDS: AppExtraKind[] = [
  "making-of",
  "arte",
  "wallpaper",
  "soundtrack",
  "video",
  "bastidores",
];

export const APP_EXTRA_KIND_LABELS: Record<AppExtraKind, string> = {
  "making-of": "Making-of",
  arte: "Arte",
  wallpaper: "Wallpaper",
  soundtrack: "Soundtrack",
  video: "Vídeo",
  bastidores: "Bastidores",
};

/** Destaque editorial do app (hero/carrossel). */
export interface AppHighlight {
  id: string;
  title: string;
  subtitle: string;
  /** caminho interno ("/obras/…") ou URL http(s) */
  target: string;
  image?: string;
  active: boolean;
}

/** Evento promovido no app. */
export interface AppEvent {
  id: string;
  title: string;
  /** ISO — data/hora do evento */
  date: string;
  description: string;
  active: boolean;
}

/** Conteúdo extra exclusivo do app (§33). */
export interface AppExtra {
  id: string;
  title: string;
  kind: AppExtraKind;
  target: string;
  active: boolean;
}

/** Scanner QR dentro do app (§33 — "scanner"). */
export interface AppScanner {
  enabled: boolean;
  title: string;
  hint: string;
  /** destino quando o QR escaneado não é da loja */
  defaultTarget: string;
}

/** Experiências específicas do app (§33 — toggles por recurso). */
export interface AppExperiences {
  feed: boolean;
  leitor: boolean;
  scanner: boolean;
  drops: boolean;
  eventos: boolean;
  offline: boolean;
}

export interface AppContent {
  highlights: AppHighlight[];
  events: AppEvent[];
  extras: AppExtra[];
  scanner: AppScanner;
  experiences: AppExperiences;
  updatedAt?: string;
}

export const APP_EXPERIENCE_FIELDS: Array<keyof AppExperiences> = [
  "feed",
  "leitor",
  "scanner",
  "drops",
  "eventos",
  "offline",
];

export const APP_EXPERIENCE_LABELS: Record<keyof AppExperiences, string> = {
  feed: "Feed de arte",
  leitor: "Leitor integrado",
  scanner: "Scanner de QR Codes",
  drops: "Drops do Cliffhanger+",
  eventos: "Agenda de eventos",
  offline: "Biblioteca offline",
};

export const DEFAULT_APP_CONTENT: AppContent = {
  highlights: [],
  events: [],
  extras: [],
  scanner: {
    enabled: true,
    title: "Escaneie o QR Code",
    hint: "Aponte a câmera para o QR Code da obra ou do produto.",
    defaultTarget: "/loja",
  },
  experiences: {
    feed: true,
    leitor: true,
    scanner: true,
    drops: true,
    eventos: true,
    offline: false,
  },
};

export type AppFieldParse<T> = { ok: true; item: T } | { ok: false; error: string };

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidTarget(value: string): boolean {
  return /^\/[^\s]*$/.test(value) || /^https?:\/\/[^\s]+$/i.test(value);
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeHighlights(raw: unknown): AppHighlight[] {
  const rows = Array.isArray(raw) ? raw : [];
  const items: AppHighlight[] = [];
  for (const row of rows.slice(0, 12)) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<AppHighlight>;
    const title = str(item.title, 120);
    const target = str(item.target, 300);
    if (!title || !isValidTarget(target)) continue;
    const image = str(item.image, 400);
    items.push({
      id: str(item.id, 60) || newId("app-hl"),
      title,
      subtitle: str(item.subtitle, 160),
      target,
      ...(image && isHttpUrl(image) ? { image } : {}),
      active: item.active !== false,
    });
  }
  return items;
}

function normalizeEvents(raw: unknown): AppEvent[] {
  const rows = Array.isArray(raw) ? raw : [];
  const items: AppEvent[] = [];
  for (const row of rows.slice(0, 24)) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<AppEvent>;
    const title = str(item.title, 120);
    if (!title) continue;
    const date = str(item.date, 40);
    const parsed = date ? new Date(date) : null;
    if (parsed && Number.isNaN(parsed.getTime())) continue;
    items.push({
      id: str(item.id, 60) || newId("app-ev"),
      title,
      date: parsed ? parsed.toISOString() : "",
      description: str(item.description, 300),
      active: item.active !== false,
    });
  }
  return items;
}

function normalizeExtras(raw: unknown): AppExtra[] {
  const rows = Array.isArray(raw) ? raw : [];
  const items: AppExtra[] = [];
  for (const row of rows.slice(0, 24)) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<AppExtra>;
    const title = str(item.title, 120);
    const target = str(item.target, 300);
    if (!title || !isValidTarget(target)) continue;
    items.push({
      id: str(item.id, 60) || newId("app-ex"),
      title,
      kind: APP_EXTRA_KINDS.includes(item.kind as AppExtraKind)
        ? (item.kind as AppExtraKind)
        : "arte",
      target,
      active: item.active !== false,
    });
  }
  return items;
}

/** Normaliza o documento `site/app` com fallback nos padrões (§33). */
export function normalizeAppContent(raw: unknown): AppContent {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<AppContent>;
  const scannerRaw = (data.scanner ?? {}) as Partial<AppScanner>;
  const expRaw = (data.experiences ?? {}) as Partial<AppExperiences>;

  const defaultTarget = str(scannerRaw.defaultTarget, 300) || DEFAULT_APP_CONTENT.scanner.defaultTarget;
  const experiences = { ...DEFAULT_APP_CONTENT.experiences };
  for (const key of APP_EXPERIENCE_FIELDS) {
    if (typeof expRaw[key] === "boolean") experiences[key] = expRaw[key] as boolean;
  }

  return {
    highlights: normalizeHighlights(data.highlights),
    events: normalizeEvents(data.events),
    extras: normalizeExtras(data.extras),
    scanner: {
      enabled: scannerRaw.enabled !== false,
      title: str(scannerRaw.title, 120) || DEFAULT_APP_CONTENT.scanner.title,
      hint: str(scannerRaw.hint, 240) || DEFAULT_APP_CONTENT.scanner.hint,
      defaultTarget: isValidTarget(defaultTarget) ? defaultTarget : DEFAULT_APP_CONTENT.scanner.defaultTarget,
    },
    experiences,
    ...(data.updatedAt ? { updatedAt: String(data.updatedAt) } : {}),
  };
}

/** Valida o formulário do painel antes de gravar `site/app` (§33). */
export function sanitizeAppContent(raw: unknown): AppFieldParse<AppContent> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Dados do aplicativo inválidos." };
  }
  const form = raw as Partial<AppContent>;
  const scanner = normalizeAppContent({ scanner: form.scanner }).scanner;
  const content = normalizeAppContent({ ...form, scanner });
  content.updatedAt = new Date().toISOString();
  return { ok: true, item: content };
}
