import { themes as localThemes } from "@/data/themes";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import { isThemeInWindow, THEME_SCHEMA_VERSION } from "@/lib/theme-css";
import type { ThemeModel } from "@/lib/types";

/**
 * Camada de dados do Theme Engine (Fase 2).
 *
 * Prioridade: Cloud Firestore (`themes`, schema 2) → modelos locais
 * (src/data/themes.ts). Cache com TTL para que edições do admin e
 * transições agendadas apareçam sem reiniciar o servidor.
 */

const CACHE_TTL_MS = 60_000;

let cache: { at: number; themes: ThemeModel[] } | null = null;

export function isValidTheme(value: unknown): value is ThemeModel {
  const t = value as ThemeModel | null;
  return Boolean(
    t &&
      t.id &&
      t.key &&
      t.name &&
      t.schemaVersion === THEME_SCHEMA_VERSION &&
      t.identity?.colors &&
      Array.isArray(t.home?.sections),
  );
}

/** Normaliza modelos antigos (sem zones) para o formato atual do CMS. */
export function normalizeTheme(theme: ThemeModel): ThemeModel {
  return {
    ...theme,
    home: {
      ...theme.home,
      destaques: Array.isArray(theme.home.destaques) ? theme.home.destaques : [],
      zones: Array.isArray(theme.home.zones) ? theme.home.zones : [],
    },
  };
}

/**
 * Lê os modelos do Firestore sem cache (uso do admin) e completa com os
 * modelos locais cujos IDs ainda não existem no banco (pré-seed).
 */
export async function readThemesFromDb(
  db: FirebaseFirestore.Firestore,
): Promise<ThemeModel[]> {
  const snap = await db.collection("themes").limit(200).get();
  const themes = snap.docs
    .map((doc) => revive({ id: doc.id, ...doc.data() }))
    .filter(isValidTheme)
    .map(normalizeTheme);
  const known = new Set(themes.map((t) => t.id));
  return [...themes, ...localThemes.filter((t) => !known.has(t.id))];
}

async function loadThemes(): Promise<ThemeModel[]> {
  if (process.env.CATALOG_SOURCE === "local") return localThemes;

  const db = getAdminDb();
  if (!db) return localThemes;

  try {
    return await readThemesFromDb(db);
  } catch (error) {
    console.warn("[themes] Firestore indisponível, usando modelos locais:", error);
    return localThemes;
  }
}

export async function getThemes(): Promise<ThemeModel[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.themes;
  const themes = await loadThemes();
  cache = { at: now, themes };
  return themes;
}

export async function getThemeById(id: string): Promise<ThemeModel | undefined> {
  const themes = await getThemes();
  return themes.find((t) => t.id === id);
}

/**
 * Modelo ativo (Documento Mestre 4.6 — agendamento automático):
 *   1. modelos publicados fora de rascunho/preview, dentro da janela;
 *   2. preferência para modelos com janela aberta agora (campanha/sazonal);
 *   3. senão o modelo `default`; em último caso, o primeiro da lista.
 */
export async function getActiveTheme(now: Date = new Date()): Promise<ThemeModel> {
  const themes = await getThemes();

  const eligible = themes.filter(
    (t) => t.status === "publicado" && isThemeInWindow(t, now),
  );

  const scheduledNow = eligible
    .filter((t) => t.scheduledStart || t.scheduledEnd)
    .sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));

  if (scheduledNow.length > 0) return scheduledNow[scheduledNow.length - 1];

  const defaultTheme = eligible.find((t) => t.kind === "default");
  if (defaultTheme) return defaultTheme;

  return themes.find((t) => t.kind === "default") ?? themes[0] ?? localThemes[0];
}
