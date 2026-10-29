// Cliffhanger — padrões visuais permanentes da loja (Documento de Correção,
// Finalização e Ajustes — §2/§4/§12/§28). Sem Theme Engine no painel:
// dois modos oficiais mantidos em código, agora na paleta monocromática
// P&B — Preto e Branco (padrão, modo escuro) e Branco e Preto (modo claro).
// Cores absolutas: preto total #000000 + branco total #FFFFFF; cinzas
// neutros ficam reservados a superfícies elevadas, bordas, texto
// secundário e estados de hover. brand/accent seguem a cor do texto
// (realces são inversões chapadas), e o token --on-brand garante o
// contraste dos preenchimentos. O header alterna entre os dois
// (ThemeSync + setTheme); temas especiais de evento são desenvolvidos
// especificamente no projeto, quando houver.

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
  // 1. Preto e Branco — padrão oficial (modo escuro da paleta monocromática:
  //    preto total #000000 + branco total #FFFFFF e cinzas neutros).
  // -------------------------------------------------------------------------
  {
    id: "theme-default",
    key: "default",
    name: "Preto e Branco",
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
        surface: "#000000",
        surfaceRaised: "#141414",
        surfaceRaised2: "#0d0d0d",
        text: "#ffffff",
        textMuted: "#a3a3a3",
        brand: "#ffffff",
        brandStrong: "#e5e5e5",
        accent: "#ffffff",
        border: "rgba(255, 255, 255, 0.14)",
        headerBg: "rgba(0, 0, 0, 0.86)",
      },
      displayFont: "bebas",
      cardRadius: "0.75rem",
      borderStyle: "clean",
    },
    home: {
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 2. Branco e Preto — modo claro da mesma paleta monocromática: inverte
  //    áreas escuras → claras (branco total #FFFFFF + preto total #000000).
  //    A logo escura é ligada automaticamente pelo motor
  //    (identity.mode === "light").
  // -------------------------------------------------------------------------
  {
    id: "theme-claro",
    key: "claro",
    name: "Branco e Preto",
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
        surface: "#ffffff",
        surfaceRaised: "#ffffff",
        surfaceRaised2: "#f2f2f2",
        text: "#000000",
        textMuted: "#525252",
        brand: "#000000",
        brandStrong: "#1a1a1a",
        accent: "#000000",
        border: "rgba(0, 0, 0, 0.16)",
        headerBg: "rgba(255, 255, 255, 0.9)",
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
