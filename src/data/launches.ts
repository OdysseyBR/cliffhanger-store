import type { Launch } from "@/lib/types";

/**
 * Lançamentos de demonstração (Documento Mestre 13.1).
 * Espelha a coleção `launches` do Firestore com fallback silencioso,
 * no mesmo padrão do catálogo (src/data/catalog.ts).
 */
export const launches: Launch[] = [
  {
    id: "lch-vh3",
    slug: "valeharts-iii-a-tregua-das-espadas",
    title: "Valeharts III",
    highlight: "A Trégua das Espadas",
    cover: { bg: "#5603AD", fg: "#F8FEFF", accent: "#FDC500", motif: "farol" },
    preOrder: true,
    releaseDate: "2026-12-05T00:00:00.000Z",
    synopsis:
      "O volume que fecha a primeira trilogia. Um cerco, um julgamento e uma escolha que reescreve o mapa. Pré-venda aberta: quem reservar até 05/12/2026 garante exemplar numerado, com envio previsto a partir dessa data.",
    trailerUrl: "/media/sample-video.mp4",
    socials: [
      {
        label: "X",
        href: "https://twitter.com/intent/tweet?text=Valeharts%20III%3A%20A%20Tr%C3%A9gua%20das%20Espadas&url=https%3A%2F%2Fwww.cliffhangerstore.xyz%2Flancamentos%2Fvaleharts-iii-a-tregua-das-espadas",
      },
      {
        label: "WhatsApp",
        href: "https://wa.me/?text=Valeharts%20III%20%C3%A9%20para%20reservar%3A%20https%3A%2F%2Fwww.cliffhangerstore.xyz%2Flancamentos%2Fvaleharts-iii-a-tregua-das-espadas",
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.cliffhangerstore.xyz%2Flancamentos%2Fvaleharts-iii-a-tregua-das-espadas",
      },
    ],
    workId: "wkb-valeharts-3",
    universeId: "uni-valeharts",
    productIds: ["prd-vh3-livro", "prd-vh3-ebook"],
    // §15 — janelas da pré-venda, envio comunicado e aviso na data
    lots: [
      {
        name: "Lote 1 — exemplares numerados",
        qty: 300,
        price: 89.9,
        closesAt: "2026-12-05T23:59:00.000Z",
      },
      {
        name: "Lote 2 — kit comemorativo",
        qty: 150,
        price: 119.9,
        closesAt: "2026-12-20T23:59:00.000Z",
      },
    ],
    shipForecast: "2026-12-08",
    notifyOnRelease: true,
    createdAt: "2026-08-15T12:00:00.000Z",
  },
  {
    id: "lch-ae-audio",
    slug: "alvorada-eletrica-em-audio",
    title: "Alvorada Elétrica em áudio",
    highlight: "Audiobook completo",
    cover: { bg: "#0C0014", fg: "#F8FEFF", accent: "#FDC500", motif: "circuito" },
    preOrder: false,
    releaseDate: "2026-11-13T00:00:00.000Z",
    synopsis:
      "A tecna de feira volta em voz alta: narração completa com trilha sonora de improviso e violão, por Caio Ferreira. Biblioteca sincronizada entre dispositivos e download liberado na data de lançamento.",
    workId: "wkb-alvorada",
    universeId: "uni-neon-sertao",
    productIds: ["prd-ae-audio"],
    // lançamento digital: sem lotes nem envio físico, só o aviso na data
    notifyOnRelease: true,
    createdAt: "2026-09-10T12:00:00.000Z",
  },
];
