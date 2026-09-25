// Cliffhanger Store — modelo de dados (Fase 0/1)
// Universo → Obra → Produtos/Edições/Formatos (Documento Mestre, seção 5.1)

export type ProductCategory =
  | "livros"
  | "ebooks"
  | "audiobooks"
  | "produtos"
  | "colecionaveis";

export type ProductType =
  | "livro-fisico"
  | "hq"
  | "artbook"
  | "ebook"
  | "audiobook"
  | "camisa"
  | "caneca"
  | "poster"
  | "marcador"
  | "adesivo"
  | "print"
  | "box"
  | "colecionavel";

export type Badge =
  | "NOVO"
  | "LANÇAMENTO"
  | "PRÉ-VENDA"
  | "EXCLUSIVO"
  | "LIMITADO"
  | "BEST-SELLER"
  | "ESGOTANDO"
  | "OFERTA"
  | "DIGITAL"
  | "EDIÇÃO ESPECIAL";

export type CoverMotif = "farol" | "circuito" | "mare" | "sal" | "recorte";

export interface Cover {
  /** cor de fundo da capa */
  bg: string;
  /** cor do texto/traço */
  fg: string;
  /** cor de destaque */
  accent: string;
  motif: CoverMotif;
}

export interface Universe {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  cover: Cover;
  createdAt: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  createdAt: string;
}

export interface Work {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authorId: string;
  universeId: string;
  synopsis: string;
  year: number;
  seriesIndex?: number;
  seriesName?: string;
  cover: Cover;
  createdAt: string;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  type: ProductType;
  category: ProductCategory;
  price: number;
  compareAt?: number;
  badge?: Badge;
  rating: number;
  reviewCount: number;
  /** unidades em estoque; 0 = esgotado */
  stock: number;
  /** true = entrega digital (biblioteca), false = envio físico */
  digital: boolean;
  workId?: string;
  universeId?: string;
  authorId?: string;
  description: string;
  specs: Spec[];
  cover?: Cover;
  /** ISO — usado em pré-vendas e lançamentos */
  releaseDate?: string;
  /** posição em mais vendidos (menor = mais vendido) */
  salesRank?: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  productIds: string[];
  createdAt: string;
}

/** Página de lançamento (Documento Mestre 13.1 — coleção `launches`). */
export interface LaunchSocial {
  label: string;
  href: string;
}

export interface Launch {
  id: string;
  slug: string;
  title: string;
  /** subtítulo/linha de destaque */
  highlight?: string;
  /** arte de destaque (SVG geométrico como as capas) */
  cover: Cover;
  /** marcação de pré-venda (13.1) */
  preOrder: boolean;
  /** ISO — data do lançamento (exibe data + countdown) */
  releaseDate: string;
  synopsis: string;
  /** trailer/teaser: URL .mp4/.webm ou embed YouTube/Vimeo */
  trailerUrl?: string;
  /** redes sociais do lançamento (13.1) */
  socials?: LaunchSocial[];
  workId?: string;
  universeId?: string;
  /** edições do lançamento */
  productIds: string[];
  createdAt: string;
}

export interface Catalog {
  universes: Universe[];
  authors: Author[];
  works: Work[];
  products: Product[];
  collections: Collection[];
  launches: Launch[];
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  qty: number;
  digital: boolean;
}

export type OrderStatus =
  | "aguardando_pagamento"
  | "pagamento_aprovado"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export interface Order {
  id: string;
  code: string;
  userId?: string;
  email: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: "pix" | "credito" | "debito";
  status: OrderStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Padrões visuais da loja (Documento de Correção, Finalização e Ajustes — §4)
// ---------------------------------------------------------------------------

/** Estado de autoria do modelo (4.5). "Agendado"/"Ativo" são derivados da janela. */
export type ThemeStatus = "rascunho" | "preview" | "publicado" | "arquivado";

/** Fase exibida no admin: autoria + derivadas de agendamento. */
export type ThemePhase = ThemeStatus | "agendado" | "ativo" | "expirado";

export type ThemeKind = "default" | "seasonal" | "festival" | "campaign" | "launch" | "custom";

export type BorderStyleKey = "clean" | "framed" | "editorial";

export interface ThemeColors {
  surface: string;
  surfaceRaised: string;
  surfaceRaised2: string;
  text: string;
  textMuted: string;
  brand: string;
  brandStrong: string;
  accent: string;
  /** rgba(...) */
  border: string;
  /** rgba(...) */
  headerBg: string;
}

export interface ThemeIdentity {
  /** claro = usa logo escura; escuro = logo branca */
  mode: "dark" | "light";
  colors: ThemeColors;
  /** chave de FONT_STACKS (tipografia de destaque) */
  displayFont: string;
  /** raio dos cards (ex.: "1.25rem") */
  cardRadius: string;
  borderStyle: BorderStyleKey;
  /**
   * Background livre do body (ex.: gradiente) — permite que festivais
   * saiam da paleta oficial. Vazio/ausente = usa --surface.
   */
  bodyBackground?: string;
}

export interface ThemeCta {
  label: string;
  href: string;
}

export interface ThemeBanner {
  eyebrow?: string;
  title: string;
  /** segunda linha do título (gradiente) */
  highlight?: string;
  description?: string;
  primaryCta?: ThemeCta;
  secondaryCta?: ThemeCta;
  /** imagem em /public (ex.: /cliffhanger-club.png) */
  image?: string;
  /** vídeo (.mp4/.webm) — Doc Mestre 3.1: banner pode suportar vídeo; substitui a imagem no quadro */
  video?: string;
  imageCaption?: string;
  imageCta?: ThemeCta;
  /** ISO — exibe contagem regressiva */
  countdown?: string;
  /** métricas exibidas no banner (Universo/Formatos/Avaliação…) */
  stats?: { label: string; value: string }[];
  /** false = Modo Somente Banner (3.3): header oculto na Home */
  showHeader: boolean;
}

export type HomeSectionKey =
  | "novidades"
  | "mais-vendidos"
  | "pre-vendas"
  | "edicoes-especiais"
  | "universos"
  | "derivados"
  | "editorial"
  | "club"
  | "newsletter"
  | "recomendacoes"
  | "colecoes"
  | "ofertas";

export interface ThemeHomeSection {
  key: HomeSectionKey;
  enabled: boolean;
}

/**
 * Zonas novas na Home — festivais sazonais saem do padrão adicionando
 * blocos que a Home oficial não tem (Documento Mestre 4.4, extensão).
 */
export type ThemeZoneType =
  | "marquee"
  | "promo-grid"
  | "category-band"
  | "editorial"
  | "countdown";

/** Onde a zona é inserida na arquitetura fixa da Home (3.x). */
export type ThemeZonePlacement = "after-menu" | "after-destaques" | "end";

export interface ThemeZoneItem {
  title: string;
  subtitle?: string;
  /** imagem enviada no admin (URL Cloudinary ou /public) */
  image?: string;
  href?: string;
}

export interface ThemeZone {
  id: string;
  type: ThemeZoneType;
  enabled: boolean;
  placement: ThemeZonePlacement;
  title?: string;
  subtitle?: string;
  /** marquee: mensagens rolantes */
  messages?: string[];
  /** promo-grid / category-band */
  items?: ThemeZoneItem[];
  /** editorial */
  image?: string;
  body?: string;
  cta?: ThemeCta;
  /** countdown: ISO */
  countdown?: string;
}

/** CMS da Home (4.4): banner, destaques, seções e zonas do modelo. */
export interface ThemeHome {
  banner: ThemeBanner;
  /** productIds; vazio = seleção automática */
  destaques: string[];
  sections: ThemeHomeSection[];
  /** zonas adicionais (festivais) — vazio no modelo default */
  zones: ThemeZone[];
}

export interface ThemeModel {
  id: string;
  /** vira o atributo data-theme no <html> */
  key: string;
  name: string;
  kind: ThemeKind;
  /** ex.: "v1.0" (4.7 versionamento) */
  version: string;
  status: ThemeStatus;
  /** 2 = schema dos padrões visuais (ignora docs de implementações antigas) */
  schemaVersion: number;
  /** id do modelo do qual este foi duplicado */
  parentOf?: string | null;
  /** ISO — janela de agendamento (4.6) */
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  createdAt: string;
  updatedAt: string;
  identity: ThemeIdentity;
  home: ThemeHome;
}
