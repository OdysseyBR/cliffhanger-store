// Cliffhanger Theme Engine — modelos iniciais (Documento Mestre 4.8).
// Mesma fonte do seed (`npm run seed`) e fallback quando o Firestore não
// tem nenhum modelo do schema 2.

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
  // 1. Default — identidade oficial atual (paleta Paleta.png)
  // -------------------------------------------------------------------------
  {
    id: "theme-default",
    key: "default",
    name: "Default",
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
  // 2. Winter Fest — festival sazonal de inverno (fora da paleta oficial:
  //    gelo/aurora, fundo próprio e zonas novas na Home)
  // -------------------------------------------------------------------------
  {
    id: "theme-winter-fest",
    key: "winter-fest",
    name: "Winter Fest",
    kind: "seasonal",
    version: "v1.0",
    status: "rascunho",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: null,
    scheduledEnd: null,
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "dark",
      colors: {
        surface: "#04101f",
        surfaceRaised: "#0a1e35",
        surfaceRaised2: "#123150",
        text: "#eafaff",
        textMuted: "#9cc4dd",
        brand: "#2f7df6",
        brandStrong: "#5aa0ff",
        accent: "#9ef0ff",
        border: "rgba(234, 250, 255, 0.18)",
        headerBg: "rgba(4, 16, 31, 0.88)",
      },
      // fundo aurora — sai completamente do fundo roxo/escuro oficial
      bodyBackground:
        "radial-gradient(80rem 40rem at 85% -10%, rgba(56, 189, 248, 0.20), transparent 60%), radial-gradient(60rem 34rem at -5% 115%, rgba(47, 125, 246, 0.28), transparent 60%), #04101f",
      displayFont: "condensed",
      cardRadius: "0.375rem",
      borderStyle: "framed",
    },
    home: {
      banner: {
        eyebrow: "Festival de inverno · até 40% off",
        title: "Cliffhanger Winter Fest",
        highlight: "Nevada de ofertas",
        description:
          "Livros, e-books e colecionáveis com preços de inverno por tempo limitado. Aqueça a estante com os universos Cliffhanger.",
        primaryCta: { label: "Ver ofertas", href: "/ofertas" },
        secondaryCta: { label: "Explorar universos", href: "/universos" },
        countdown: "2026-12-31T23:59:59.000Z",
        showHeader: true,
      },
      destaques: [],
      // ordem própria do festival — ofertas em primeiro
      sections: sections([
        "ofertas",
        "novidades",
        "mais-vendidos",
        "edicoes-especiais",
        "pre-vendas",
        "universos",
        "derivados",
        "editorial",
        "colecoes",
        "club",
        "newsletter",
      ]),
      zones: [
        {
          id: "zone-winter-marquee",
          type: "marquee",
          enabled: true,
          placement: "after-menu",
          messages: [
            "Winter Fest até 40% off",
            "Frete grátis acima de R$ 199",
            "Edições de inverno numeradas",
            "Cupom NEVADA no Clube",
          ],
        },
        {
          id: "zone-winter-promo",
          type: "promo-grid",
          enabled: true,
          placement: "after-destaques",
          title: "Aqueça a estante",
          subtitle: "Curadoria do festival — enquanto durar o estoque de inverno.",
          items: [
            {
              title: "Cakes gelados de leitura",
              subtitle: "Boxes completos com desconto de inverno",
              href: "/colecionaveis",
            },
            {
              title: "Maratonas em e-book",
              subtitle: "Trilogias inteiras pela metade do preço",
              href: "/ebooks",
            },
            {
              title: "Presentes que atravessam o frio",
              subtitle: "Canecas, posters e colecionáveis",
              href: "/produtos",
            },
          ],
        },
        {
          id: "zone-winter-editorial",
          type: "editorial",
          enabled: true,
          placement: "end",
          title: "Carta de inverno",
          body:
            "Enquanto a neva lá fora, os universos Cliffhanger esquentam: uma seleção de histórias longas para ler debaixo da cobertura, com preço de festival até 31 de dezembro.",
          cta: { label: "Ler a seleção", href: "/loja" },
        },
        {
          id: "zone-winter-band",
          type: "category-band",
          enabled: true,
          placement: "end",
          title: "Comprar por ocasião",
          items: [
            { title: "Presentes de inverno", href: "/produtos", subtitle: "a partir de R$ 39" },
            { title: "Boxes", href: "/colecionaveis", subtitle: "edições completas" },
            { title: "Audiobooks", href: "/audiobooks", subtitle: "para noites longas" },
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // 3. Summer Fest — festival sazonal de verão BR (coral/turquesa sobre
  //    areia quente — outra cara inteira da Home), agendada
  // -------------------------------------------------------------------------
  {
    id: "theme-summer-fest",
    key: "summer-fest",
    name: "Summer Fest",
    kind: "seasonal",
    version: "v1.0",
    status: "publicado",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: "2026-12-01T00:00:00.000Z",
    scheduledEnd: "2027-02-28T23:59:59.000Z",
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "light",
      colors: {
        surface: "#fff7ed",
        surfaceRaised: "#ffffff",
        surfaceRaised2: "#ffedd5",
        text: "#431407",
        textMuted: "#9a5a3a",
        brand: "#06b6d4",
        brandStrong: "#0891b2",
        accent: "#f97316",
        border: "rgba(67, 20, 7, 0.14)",
        headerBg: "rgba(255, 247, 237, 0.9)",
      },
      // pôr do sol na praia — areia + coral + turquesa, fora da paleta oficial
      bodyBackground:
        "radial-gradient(70rem 35rem at 88% -10%, rgba(249, 115, 22, 0.18), transparent 60%), radial-gradient(55rem 28rem at -5% 115%, rgba(6, 182, 212, 0.20), transparent 60%), #fff7ed",
      displayFont: "serif",
      cardRadius: "1.75rem",
      borderStyle: "clean",
    },
    home: {
      banner: {
        eyebrow: "Verão Cliffhanger · dezembro a fevereiro",
        title: "Summer Fest",
        highlight: "Leitura à sombra",
        description:
          "A estação mais clara do ano traz box, canecas geladas e e-books com desconto. Novos universos a cada semana.",
        primaryCta: { label: "Ver ofertas", href: "/ofertas" },
        secondaryCta: { label: "Lançamentos", href: "/lancamentos" },
        showHeader: true,
      },
      destaques: [],
      // ordem própria do festival
      sections: sections([
        "novidades",
        "ofertas",
        "derivados",
        "mais-vendidos",
        "colecoes",
        "universos",
        "pre-vendas",
        "edicoes-especiais",
        "editorial",
        "recomendacoes",
        "club",
        "newsletter",
      ]),
      zones: [
        {
          id: "zone-summer-marquee",
          type: "marquee",
          enabled: true,
          placement: "after-menu",
          messages: [
            "Summer Fest · dezembro a fevereiro",
            "Novos universos toda semana",
            "Canecas geladas até 30% off",
            "Frete rápido para todo o Brasil",
          ],
        },
        {
          id: "zone-summer-band",
          type: "category-band",
          enabled: true,
          placement: "after-destaques",
          title: "Clima de férias",
          items: [
            { title: "Praia + livro", href: "/livros", subtitle: "a partir de R$ 29" },
            { title: "Trilhas sonoras", href: "/audiobooks", subtitle: "ouve no fone" },
            { title: "Kit verão", href: "/colecionaveis", subtitle: "edições leves" },
          ],
        },
        {
          id: "zone-summer-promo",
          type: "promo-grid",
          enabled: true,
          placement: "end",
          title: "Férias Cliffhanger",
          subtitle: "Três jeitos de passar o verão lendo.",
          items: [
            {
              title: "Sol alto, suspense maior",
              subtitle: "Suspense e mistério com desconto de verão",
              href: "/ofertas",
            },
            {
              title: "Universos novos",
              subtitle: "Comece uma saga inteira nas férias",
              href: "/universos",
            },
            {
              title: "Derivados de verão",
              subtitle: "Camisetas leves, canecas e posters",
              href: "/produtos",
            },
          ],
        },
        {
          id: "zone-summer-countdown",
          type: "countdown",
          enabled: true,
          placement: "end",
          title: "Últimos dias de verão",
          subtitle: "O festival acaba em fevereiro — depois disso os preços voltam.",
          countdown: "2027-02-28T23:59:59.000Z",
          cta: { label: "Aproveitar agora", href: "/ofertas" },
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // 4. Halloween Fest — festival de outubro
  // -------------------------------------------------------------------------
  {
    id: "theme-halloween-fest",
    key: "halloween-fest",
    name: "Halloween Fest",
    kind: "festival",
    version: "v1.0",
    status: "preview",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: "2026-10-10T00:00:00.000Z",
    scheduledEnd: "2026-11-02T23:59:59.000Z",
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "dark",
      colors: {
        surface: "#0b0408",
        surfaceRaised: "#1c0b12",
        surfaceRaised2: "#2a1119",
        text: "#fff7ed",
        textMuted: "#d6c2b5",
        brand: "#6400b2",
        brandStrong: "#9333ea",
        accent: "#ff7a1a",
        border: "rgba(255, 124, 26, 0.20)",
        headerBg: "rgba(11, 4, 8, 0.90)",
      },
      displayFont: "serif",
      cardRadius: "0.5rem",
      borderStyle: "editorial",
    },
    home: {
      banner: {
        eyebrow: "31 de outubro · medo e suspense",
        title: "Halloween Fest",
        highlight: "Noite de cliffhangers",
        description:
          "Terror, mistério e edições sombrias. Horror Cliffhanger com descontos especiais e capa alternativa exclusiva.",
        primaryCta: { label: "Explorar terror", href: "/buscar?q=terror" },
        secondaryCta: { label: "Edições especiais", href: "/colecionaveis" },
        countdown: "2026-11-01T00:00:00.000Z",
        showHeader: true,
      },
      destaques: [],
      sections: sections([
        "novidades",
        "mais-vendidos",
        "pre-vendas",
        "edicoes-especiais",
        "editorial",
        "ofertas",
        "club",
        "newsletter",
      ]),
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 5. Christmas Fest — festival de dezembro
  // -------------------------------------------------------------------------
  {
    id: "theme-christmas-fest",
    key: "christmas-fest",
    name: "Christmas Fest",
    kind: "festival",
    version: "v1.0",
    status: "preview",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: "2026-12-10T00:00:00.000Z",
    scheduledEnd: "2026-12-26T23:59:59.000Z",
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "dark",
      colors: {
        surface: "#04150c",
        surfaceRaised: "#0b2416",
        surfaceRaised2: "#12331f",
        text: "#f0fdf4",
        textMuted: "#a7c9b4",
        brand: "#14532d",
        brandStrong: "#16a34a",
        accent: "#fdc500",
        border: "rgba(240, 253, 244, 0.16)",
        headerBg: "rgba(4, 21, 12, 0.88)",
      },
      displayFont: "serif",
      cardRadius: "1rem",
      borderStyle: "framed",
    },
    home: {
      banner: {
        eyebrow: "Presentes que viram histórias",
        title: "Christmas Fest",
        highlight: "Cesta Cliffhanger",
        description:
          "Kits presenteáveis, canecas e edições numeradas com embalagem especial. Frete grátis acima de R$ 199.",
        primaryCta: { label: "Ver kits", href: "/colecionaveis" },
        secondaryCta: { label: "Ofertas", href: "/ofertas" },
        countdown: "2026-12-25T00:00:00.000Z",
        showHeader: true,
      },
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 6. Black Friday — campanha agendada (novembro)
  // -------------------------------------------------------------------------
  {
    id: "theme-black-friday",
    key: "black-friday",
    name: "Black Friday",
    kind: "campaign",
    version: "v1.0",
    status: "publicado",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: "2026-11-23T00:00:00.000Z",
    scheduledEnd: "2026-11-30T23:59:59.000Z",
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "dark",
      colors: {
        surface: "#000000",
        surfaceRaised: "#101010",
        surfaceRaised2: "#1c1c1c",
        text: "#fafafa",
        textMuted: "#a3a3a3",
        brand: "#262626",
        brandStrong: "#404040",
        accent: "#fdc500",
        border: "rgba(250, 250, 250, 0.16)",
        headerBg: "rgba(0, 0, 0, 0.92)",
      },
      displayFont: "condensed",
      cardRadius: "0.25rem",
      borderStyle: "framed",
    },
    home: {
      banner: {
        eyebrow: "23 a 30 de novembro · só essa semana",
        title: "Black Friday Cliffhanger",
        highlight: "Até 70% off",
        description:
          "A maior campanha do ano: livros, boxes e colecionáveis com descontos relâmpago e cupom extra no Clube.",
        primaryCta: { label: "Ir para as ofertas", href: "/ofertas" },
        secondaryCta: { label: "Mais vendidos", href: "/loja" },
        countdown: "2026-11-30T23:59:59.000Z",
        showHeader: true,
      },
      destaques: [],
      sections: sections([
        "ofertas",
        "mais-vendidos",
        "novidades",
        "pre-vendas",
        "edicoes-especiais",
        "colecoes",
        "club",
        "newsletter",
      ]),
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 7. Anniversary — aniversário da loja (rascunho)
  // -------------------------------------------------------------------------
  {
    id: "theme-anniversary",
    key: "anniversary",
    name: "Anniversary",
    kind: "campaign",
    version: "v1.0",
    status: "rascunho",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: null,
    scheduledEnd: null,
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "light",
      colors: {
        surface: "#faf7ff",
        surfaceRaised: "#ffffff",
        surfaceRaised2: "#f1ebff",
        text: "#1a0a2e",
        textMuted: "#5c4a7a",
        brand: "#6400b2",
        brandStrong: "#4c0085",
        accent: "#ffc600",
        border: "rgba(26, 10, 46, 0.14)",
        headerBg: "rgba(250, 247, 255, 0.88)",
      },
      displayFont: "bebas",
      cardRadius: "1.25rem",
      borderStyle: "clean",
    },
    home: {
      banner: {
        eyebrow: "Aniversário Cliffhanger Store",
        title: "5 anos de cliffhangers",
        highlight: "Obrigado por ler com a gente",
        description:
          "Celebre comedições comemorativas numeradas, retrospectiva dos universos e conteúdo exclusivo do Clube.",
        primaryCta: { label: "Comemorar", href: "/colecionaveis" },
        secondaryCta: { label: "Coleções", href: "/loja" },
        stats: [
          { label: "Anos", value: "5" },
          { label: "Obras", value: "8" },
          { label: "Leitores", value: "12k" },
        ],
        showHeader: true,
      },
      destaques: [],
      sections: ALL_SECTIONS,
      zones: [],
    },
  },

  // -------------------------------------------------------------------------
  // 8. Valleharts Launch — modelo de lançamento (rascunho)
  // -------------------------------------------------------------------------
  {
    id: "theme-valleharts-launch",
    key: "valleharts-launch",
    name: "Valleharts Launch",
    kind: "launch",
    version: "v1.0",
    status: "rascunho",
    schemaVersion: 2,
    parentOf: "theme-default",
    scheduledStart: null,
    scheduledEnd: null,
    createdAt: now,
    updatedAt: now,
    identity: {
      mode: "dark",
      colors: {
        surface: "#060b16",
        surfaceRaised: "#101a2e",
        surfaceRaised2: "#182538",
        text: "#f1f5f9",
        textMuted: "#94a3b8",
        brand: "#1d4ed8",
        brandStrong: "#3b82f6",
        accent: "#fdc500",
        border: "rgba(241, 245, 249, 0.14)",
        headerBg: "rgba(6, 11, 22, 0.88)",
      },
      displayFont: "bebas",
      cardRadius: "0.75rem",
      borderStyle: "clean",
    },
    home: {
      banner: {
        eyebrow: "Lançamento · pré-venda aberta",
        title: "Valeharts III",
        highlight: "A Trégua das Espadas",
        description:
          "Modelo exclusivo para o lançamento: banner, destaques e seções já apontando para a conclusão da trilogia.",
        primaryCta: {
          label: "Reservar agora",
          href: "/produtos/valeharts-iii-a-tregua-das-espadas-livro-fisico",
        },
        secondaryCta: { label: "Obra completa", href: "/obras/valeharts-i-o-ultimo-farol" },
        countdown: "2026-12-05T00:00:00.000Z",
        stats: [
          { label: "Volume", value: "3" },
          { label: "Formatos", value: "4" },
          { label: "Pré-venda", value: "Aberta" },
        ],
        showHeader: true,
      },
      destaques: [],
      sections: sections([
        "pre-vendas",
        "novidades",
        "editorial",
        "universos",
        "mais-vendidos",
        "derivados",
        "colecoes",
        "newsletter",
      ]),
      zones: [],
    },
  },
];
