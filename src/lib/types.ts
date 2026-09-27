// Cliffhanger Store — modelo de dados (Fase 0/1)
// Universo → Obra → Produtos/Edições/Formatos (Documento Mestre, seção 5.1)

import type { AdminRole } from "@/lib/roles";

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
  /** §14 — unidades reservadas (pré-venda e pedidos em separação) */
  reserved?: number;
  /** §14 — alerta de estoque baixo quando `stock <= minStock` (0 = sem alerta) */
  minStock?: number;
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

/** §12 — item da biblioteca na visão do módulo Biblioteca Digital. */
export interface AdminLibraryItem {
  id: string;
  productId: string;
  title: string;
  type: "ebook" | "audiobook";
  /** ISO */
  purchasedAt: string;
  /** pelo menos um arquivo com download liberado (licença §8) */
  allowDownload: boolean;
  /** o produto não existe mais no catálogo (item legado) */
  missing: boolean;
  progress?: ReadingProgress;
}

/** §12/§8 — biblioteca de um cliente (licenças digitais + progresso). */
export interface AdminLibrary {
  /** id do documento = uid da conta */
  uid: string;
  name?: string;
  email?: string;
  /** ISO */
  updatedAt?: string;
  items: AdminLibraryItem[];
  /** itens com progresso gravado */
  progressCount: number;
  /** marcadores somados (§8) */
  bookmarks: number;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  productIds: string[];
  createdAt: string;
}

/**
 * Categoria de produto do painel (Documento de Correção §12 — módulo
 * Categorias; coleção `categories`). `slug` é o valor usado em
 * `Product.category` quando a categoria já participa da loja (ex.:
 * livros, ebooks, audiobooks).
 */
export type CategoryType = "fisico" | "digital" | "hibrido";

export interface Category {
  id: string;
  slug: string;
  name: string;
  /** formato dominante dos produtos da categoria */
  typeId: CategoryType;
  description: string;
  /** URL da arte de destaque (opcional) */
  image: string;
  /** posição na listagem (menor = primeiro) */
  sort: number;
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
  /** §15 — lotes de pré-venda (janela de vendas com quantidade) */
  lots?: LaunchLot[];
  /** ISO — previsão de envio comunicada ao cliente na pré-venda */
  shipForecast?: string;
  /** §15 — avisar assinantes na data de lançamento */
  notifyOnRelease?: boolean;
  createdAt: string;
}

/** §15 — lote de uma pré-venda: nome, volume e preço da janela. */
export interface LaunchLot {
  name: string;
  qty: number;
  price?: number;
  /** ISO — encerramento do lote (opcional) */
  closesAt?: string;
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
  /** ISO — última alteração (ex.: mudança de status no painel §12) */
  updatedAt?: string;
}

/** §14 — movimentação de estoque: histórico com motivo, autor e valores. */
export type StockKind = "entrada" | "saida" | "ajuste";

export interface StockMovement {
  id: string;
  productId: string;
  productTitle: string;
  kind: StockKind;
  /** entradas/saídas: unidades; ajuste: valor absoluto após o ajuste */
  qty: number;
  before: number;
  after: number;
  /** §14 — motivo obrigatório do ajuste */
  reason: string;
  /** e-mail do administrador que moveu o estoque */
  actor: string;
  at: string;
}

/**
 * §12 — módulo Clientes: leitura agregada dos pedidos (não existe coleção
 * própria; o cliente nasce do pedido) — por isso só há permissão de leitura.
 */
export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  orders: number;
  items: number;
  /** soma dos pedidos não cancelados */
  spent: number;
  firstOrderAt: string;
  lastOrderAt: string;
  /** null = conta sem pedidos ainda */
  lastStatus: OrderStatus | null;
  /** últimos pedidos do cliente (módulo Clientes §12) */
  recent: AdminCustomerOrder[];
}

export interface AdminCustomerOrder {
  id: string;
  code: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
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
// Marketing — Promoções, Club, Avaliações e Notificações (§12/§16/§18/§19)
// ---------------------------------------------------------------------------

/**
 * §16 — campanha que combina produtos, coleção, cupom, banner e período.
 * O desconto em si continua sendo o do cupom vinculado e o do `compareAt`
 * dos produtos (página /ofertas); a promoção organiza e agenda a campanha.
 */
export interface Promotion {
  id: string;
  title: string;
  description: string;
  productIds: string[];
  /** coleção em destaque (opcional) */
  collectionId?: string;
  /** cupom da campanha (opcional — precisa existir em `coupons`) */
  couponCode?: string;
  /** banner da campanha (opcional — precisa existir em `banners`) */
  bannerId?: string;
  /** ISO | null = sem início/fim */
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fase exibida no painel: derivada da janela + flag `active`. */
export type PromotionPhase = "ativa" | "agendada" | "expirada" | "inativa";

/** §18 — benefício trocável por pontos do Cliffhanger Club. */
export interface ClubBenefit {
  id: string;
  title: string;
  description: string;
  /** custo em pontos */
  cost: number;
  /** §18: cupons, frete, produtos exclusivos e conteúdo digital */
  kind: "cupom" | "frete" | "produto" | "conteudo";
  /** cupom entregue no resgate (só quando kind = "cupom") */
  couponCode?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** §18 — membro do clube (documento `clubMembers/{uid}`). */
export interface ClubMember {
  uid: string;
  name?: string;
  email?: string;
  points: number;
  updatedAt: string;
}

/** Nível derivado dos pontos (§18). */
export type ClubTier = "Farol" | "Maré" | "Lenda";

/**
 * §19 — avaliação de cliente (coleção `reviews`). `verified` = compra
 * verificada (e-mail + produto em `orders`); `status` é a moderação do
 * painel (atendimento/administrador).
 */
export interface Review {
  id: string;
  productId: string;
  productTitle?: string;
  authorName: string;
  email?: string;
  /** 1–5 */
  rating: number;
  comment: string;
  /** URLs de fotos (máx. 3) */
  photos: string[];
  verified: boolean;
  status: "pendente" | "aprovada" | "rejeitada";
  createdAt: string;
  updatedAt: string;
}

/** §16 — comunicado do painel (coleção `notifications`). */
export interface StoreNotification {
  id: string;
  title: string;
  body: string;
  channels: Array<"email" | "in_app" | "push">;
  /** "all" = toda a base · "club" = membros do clube */
  targetAudience: "all" | "club";
  status: "draft" | "scheduled" | "sent";
  /** ISO | null — exigido quando agendada */
  scheduledAt: string | null;
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


/**
 * Conta com acesso ao painel — Documento de Correção §13.
 * Colecao \dminUsers\ (id = e-mail normalizado). O super admin unico
 * (SUPER_ADMIN_EMAIL) NAO precisa de registro: e implicitamente
 * "administrador".
 */
export interface AdminUser {
  /** e-mail normalizado (minusculo) — id do documento */
  email: string;
  /** uid do Firebase Auth, quando ja resolvido */
  uid?: string;
  /** nome exibido no painel */
  name?: string;
  /** papel da §13 */
  role: AdminRole;
  /** false = acesso suspenso sem apagar o historico */
  active: boolean;
  /** e-mail de quem concedeu o acesso */
  grantedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Registro de auditoria — Documento de Correção §13 (colecao \uditLogs\). */
export interface AuditLogEntry {
  id: string;
  /** ISO */
  at: string;
  actor: string;
  uid?: string;
  role?: string;
  action: string;
  module: string;
  entity: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}