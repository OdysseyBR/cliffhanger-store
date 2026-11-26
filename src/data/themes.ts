// Litterae — padrões visuais permanentes da livraria (Documento de Correção,
// Finalização e Ajustes — §2/§4/§12/§28). Sem Theme Engine no painel:
// dois modos oficiais mantidos em código — Escuro (padrão) e Claro —,
// ambos na paleta oficial da marca: laranja #e67817 (brand/accent),
// off-white #f7f4f3 e quase-preto #02000e (superfícies e texto).
// O laranja é a cor da marca nos dois modos; o token --on-brand fica fixo
// em #02000e (contraste AA sobre o laranja). Off-white e quase-preto
// invertem entre os modos; cinzas neutros ficam reservados a superfícies
// elevadas, bordas, texto secundário e hover. O header alterna entre os
// dois (ThemeSync + setTheme); temas especiais de evento são desenvolvidos
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
  // 1. Escuro — padrão oficial (quase-preto #02000e + off-white #f7f4f3,
  //    com laranja #e67817 em brand/accent e --on-brand #02000e).
  // -------------------------------------------------------------------------
  {
    id: "theme-default",
    key: "default",
    name: "Escuro",
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
        surface: "#02000e",
        surfaceRaised: "#14121f",
        surfaceRaised2: "#0b0913",
        text: "#f7f4f3",
        textMuted: "#a3a0a8",
        brand: "#e67817",
        brandStrong: "#f08a2e",
        accent: "#e67817",
        onBrand: "#02000e",
        border: "rgba(247, 244, 243, 0.14)",
        headerBg: "rgba(2, 0, 14, 0.86)",
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
  // 2. Claro — modo claro da mesma paleta: inverte as áreas escuras →
  //    claras (off-white #f7f4f3 + quase-preto #02000e), mantendo o
  //    laranja #e67817 da marca em brand/accent. A logo escura é ligada
  //    automaticamente pelo motor (identity.mode === "light").
  // -------------------------------------------------------------------------
  {
    id: "theme-claro",
    key: "claro",
    name: "Claro",
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
        surface: "#f7f4f3",
        surfaceRaised: "#ffffff",
        surfaceRaised2: "#ece8e7",
        text: "#02000e",
        textMuted: "#56525e",
        brand: "#e67817",
        brandStrong: "#cf6a0f",
        accent: "#e67817",
        onBrand: "#02000e",
        border: "rgba(2, 0, 14, 0.16)",
        headerBg: "rgba(247, 244, 243, 0.9)",
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
