import { themes as localThemes } from "@/data/themes";
import type { ThemeModel } from "@/lib/types";

/**
 * Camada de dados dos padrões visuais da loja.
 *
 * Sem Theme Engine no painel (Documento de Correção §2/§12): os dois
 * padrões oficiais vivem em código (src/data/themes.ts) e são lidos
 * direto — sem Firestore, sem cache e sem agendamento. Temas de evento
 * serão implementados no projeto, quando houver.
 */

/** Padrão ativo da loja (servidor): o Padrão Cliffhanger. */
export async function getActiveTheme(): Promise<ThemeModel> {
  return localThemes.find((theme) => theme.kind === "default") ?? localThemes[0];
}

/** Todos os padrões — o layout injeta o CSS dos dois em html[data-theme=…]. */
export async function getThemes(): Promise<ThemeModel[]> {
  return localThemes;
}
