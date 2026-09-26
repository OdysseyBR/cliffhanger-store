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
  /** §8 — arquivos digitais (PDF do e-book / áudio do audiobook) */
  files?: DigitalFile[];
  /** §8 — sumário: páginas (e-book) ou segundos (audiobook) */
  chapters?: Chapter[];
}

// ---------------------------------------------------------------------------
// Produtos digitais — plataforma própria (Documento Mestre, seção 8)
// ---------------------------------------------------------------------------

/** Tipo de arquivo digital entregue na biblioteca. */
export type DigitalKind = "pdf" | "audio";

/** Arquivo de um produto digital (snapshot da licença ao comprar). */
export interface DigitalFile {
  kind: DigitalKind;
  url: string;
  name: string;
  /** download direto é permitido? (controle de licença §8) */
  allowDownload: boolean;
}

/** Capítulo/sumário — `start` = página (e-book) ou segundo (audiobook). */
export interface Chapter {
  title: string;
  start: number;
}

/** Item comprado que habilita leitura/escuta na biblioteca digital. */
export interface LibraryItem {
  /** id estável `item-<productId>` (1 item por produto) */
  id: string;
  productId: string;
  orderId?: string;
  title: string;
  slug?: string;
  type: "ebook" | "audiobook";
  image?: string;
  files: DigitalFile[];
  /** ISO */
  purchasedAt: string;
}

/** Marcador de leitura/escuta (página ou segundo). */
export interface Bookmark {
  id: string;
  label: string;
  /** e-book: página */
  page?: number;
  /** audiobook: posição em segundos */
  position?: number;
  createdAt: string;
}

/** Progresso sincronizado entre dispositivos (Firestore `libraries/{uid}/progress`). */
export interface ReadingProgress {
  productId: string;
  kind: "ebook" | "audiobook";
  /** e-book: página atual (1-based) */
  page?: number;
  /** e-book: total de páginas */
  pages?: number;
  /** 0–100 */
  percent: number;
  /** audiobook: posição em segundos */
  position?: number;
  bookmarks: Bookmark[];
  updatedAt: string;
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
  /** §17 — item comprado em pré-venda (reserva; envio na data prevista) */
  preOrder?: boolean;
}

export type OrderStatus =
  | "aguardando_pagamento"
  | "pagamento_aprovado"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export interface OrderAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** §17 — opção de presente no checkout (destinatário, recado e embrulho). */
export interface OrderGift {
  to: string;
  message: string;
  wrap: boolean;
}

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
  /** §17 — cupom aplicado e desconto concedido (validado no servidor) */
  couponCode?: string | null;
  discount?: number;
  /** §17 — opção de presente gravada no pedido */
  gift?: OrderGift | null;
  address?: OrderAddress | null;
  customer?: { name: string; phone: string } | null;
}

/** §17/§12 — cupom de desconto (coleção `coupons` no Firestore). */
export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  /** percent: 10 = 10% · fixed: valor em R$ */
  value: number;
  /** subtotal mínimo para usar (0 = sem mínimo) */
  minSubtotal: number;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  /** null = uso ilimitado */
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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

/** CMS da Home (4.4): destaques, seções e zonas do modelo. */
export interface ThemeHome {
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

/**
 * Banner da Home — Documento de Correção §5.
 *
 * O banner é uma ARTE FINAL ÚNICA enviada por upload pelo admin
 * (sem construtor e sem camadas editáveis). O sistema apenas controla
 * exibição, destino, ativação, ordenação, agendamento e demais
 * configurações funcionais.
 */
export type BannerDestinationType =
  | "produto"
  | "obra"
  | "colecao"
  | "lancamento"
  | "campanha"
  | "pagina"
  | "externo";

export interface Banner {
  id: string;
  /** rótulo interno do banner no painel */
  name: string;
  /** arte final única — URL (Cloudinary ou /public) */
  image: string;
  /** versão mobile da arte (quando necessário) */
  imageMobile?: string;
  /** texto alternativo — acessibilidade (§25) */
  alt: string;
  destinationType: BannerDestinationType;
  /** slug/id/caminho/URL conforme o tipo de destino */
  destinationValue: string;
  /** ordem de exibição (menor primeiro) */
  order: number;
  active: boolean;
  /** ISO — início do agendamento (vazio = imediato) */
  startsAt?: string;
  /** ISO — fim do agendamento (vazio = sem término) */
  endsAt?: string;
  /** exibição fullscreen quando a experiência exigir (§5) */
  fullscreen: boolean;
  /** false = Modo Somente Banner (§3): header removido na Home */
  showHeader: boolean;
  createdAt: string;
  updatedAt: string;
}
