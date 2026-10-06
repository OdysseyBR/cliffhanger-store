// Cliffhanger — padrões visuais permanentes da loja (Documento de Correção,
// Finalização e Ajustes — §2/§4/§12/§28). Sem Theme Engine no painel:
// dois modos oficiais mantidos em código — Padrão Cliffhanger (modo escuro)
// e Padrão Cliffhanger Claro (modo claro), os dois na paleta aprovada na
// Etapa K: vermelho #A30707 + areia #E7CB9B sobre #0E0000. O header alterna
// entre os dois (ThemeSync + setTheme); temas especiais de evento são
// desenvolvidos especificamente no projeto, quando houver.

import type {
  HomeSectionKey,
  ThemeHomeSection,
  ThemeModel,
} from "@/lib/types";
import { HOME_SECTION_ORDER } from "@/lib/theme-css";

/** Monta a lista de seções na ordem oficial, habilitando só as informadas. */
function sections(enabled: HomeSectionKey[]): ThemeHomeSection[] {
  const set = new Set(enabled);
  return HOME_SECTION_ORDER.filter((key) => set.has(key)).map((key) => ({
    key,
    enabled: true,
  }));
}

const ALL_SECTIONS = sections(HOME_SECTION_ORDER);

const now = "2026-09-23T00:00:00.000Z";

export const themes: ThemeModel[] = [
  // -------------------------------------------------------------------------
  // 1. Padrão Cliffhanger — modo escuro oficial (paleta vencedora da
  //    Etapa K, "Paleta 4": 0E0000 / A30707 / E7CB9B / F8FEFF).
  // -------------------------------------------------------------------------
  {
    id: "theme-default",
    key: "default",
    name: "Padrão Cliffhanger",
    kind: "default",
    version: "v1.0",
    status: "publicado",
    schemaVersion: 2,
    parentOf: null,
    scheduledStart: null,
    scheduledEnd: null,
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "dark",
      colors: {
        surface: "#0e0000",
        surfaceRaised: "#210303",
        surfaceRaised2: "#300707",
        text: "#f8feff",
        textMuted: "#d3b7a4",
        brand: "#a30707",
        brandStrong: "#d13a3a",
        accent: "#e7cb9b",
        border: "rgba(248, 254, 255, 0.14)",
        headerBg: "rgba(14, 0, 0, 0.86)",
      },
      displayFont: "bebas",
      cardRadius: "1.25rem",
      borderStyle: "clean",
    },
    home: {
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 2. Padrão Cliffhanger Claro — modo claro da mesma identidade (§4):
  //    inverte áreas escuras → claras mantendo vermelho + areia. A areia
  //    escurece (#826533) para manter contraste legível em fundo claro;
  //    o hover/foco do vermelho também escurece (#7e0404). A logo escura
  //    é ligada automaticamente pelo motor (identity.mode === "light").
  // -------------------------------------------------------------------------
  {
    id: "theme-claro",
    key: "claro",
    name: "Padrão Cliffhanger Claro",
    kind: "custom",
    version: "v1.0",
    status: "publicado",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: null,
    scheduledEnd: null,
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "light",
      colors: {
        surface: "#fbf7f1",
        surfaceRaised: "#ffffff",
        surfaceRaised2: "#f3e9dc",
        text: "#170303",
        textMuted: "#6e5a51",
        brand: "#a30707",
        brandStrong: "#7e0404",
        accent: "#826533",
        border: "rgba(23, 3, 3, 0.16)",
        headerBg: "rgba(251, 247, 241, 0.9)",
      },
      displayFont: "bebas",
      cardRadius: "1.25rem",
      borderStyle: "clean",
    },
    home: {
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },
];
