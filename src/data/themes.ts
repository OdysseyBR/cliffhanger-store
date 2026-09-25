// Cliffhanger — padrões visuais permanentes da loja (Documento de Correção,
// Finalização e Ajustes — §2/§4/§12/§28). Sem Theme Engine no painel:
// dois padrões oficiais mantidos em código — Padrão Cliffhanger (identidade
// escura) e Padrão Cliffhanger Claro (áreas escuras invertidas para claras,
// sem perder roxo/branco/preto + dourado). Temas especiais de evento são
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
  // 1. Padrão Cliffhanger — identidade oficial atual (paleta Paleta.png)
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
        surface: "#0c0014",
        surfaceRaised: "#180a28",
        surfaceRaised2: "#241038",
        text: "#f8feff",
        textMuted: "#b9a9d0",
        brand: "#5603ad",
        brandStrong: "#7a2fd0",
        accent: "#fdc500",
        border: "rgba(248, 254, 255, 0.14)",
        headerBg: "rgba(12, 0, 20, 0.86)",
      },
      displayFont: "bebas",
      cardRadius: "1.25rem",
      borderStyle: "clean",
    },
    home: {
      banner: {
        eyebrow: "Pré-venda aberta · envio em 05/12/2026",
        title: "Valeharts III",
        highlight: "A Trégua das Espadas",
        description:
          "O volume que fecha a primeira trilogia chegou à loja em pré-venda. Reserve agora e garanta exemplar numerado, capa dura e envio prioritário.",
        primaryCta: {
          label: "Reservar agora",
          href: "/produtos/valeharts-iii-a-tregua-das-espadas-livro-fisico",
        },
        secondaryCta: { label: "Ver todos os livros", href: "/livros" },
        stats: [
          { label: "Universo", value: "Valeharts" },
          { label: "Formatos", value: "3" },
          { label: "Avaliação", value: "5,0" },
        ],
        showHeader: true,
      },
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 2. Padrão Cliffhanger Claro — variação clara da identidade (§4):
  //    inverte áreas escuras → claras mantendo roxo/branco/preto + dourado.
  //    O dourado escurece (#8a6b00) para manter contraste legível em fundo
  //    claro; roxo e branco permanecem os oficiais.
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
        surface: "#f8feff",
        surfaceRaised: "#ffffff",
        surfaceRaised2: "#f1ebfa",
        text: "#0c0014",
        textMuted: "#4f4468",
        brand: "#5603ad",
        brandStrong: "#7a2fd0",
        accent: "#8a6b00",
        border: "rgba(12, 0, 20, 0.16)",
        headerBg: "rgba(248, 254, 255, 0.9)",
      },
      displayFont: "bebas",
      cardRadius: "1.25rem",
      borderStyle: "clean",
    },
    home: {
      banner: {
        eyebrow: "Pré-venda aberta · envio em 05/12/2026",
        title: "Valeharts III",
        highlight: "A Trégua das Espadas",
        description:
          "O volume que fecha a primeira trilogia chegou à loja em pré-venda. Reserve agora e garanta exemplar numerado, capa dura e envio prioritário.",
        primaryCta: {
          label: "Reservar agora",
          href: "/produtos/valeharts-iii-a-tregua-das-espadas-livro-fisico",
        },
        secondaryCta: { label: "Ver todos os livros", href: "/livros" },
        stats: [
          { label: "Universo", value: "Valeharts" },
          { label: "Formatos", value: "3" },
          { label: "Avaliação", value: "5,0" },
        ],
        showHeader: true,
      },
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },
];
