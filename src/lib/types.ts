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

export interface Catalog {
  universes: Universe[];
  authors: Author[];
  works: Work[];
  products: Product[];
  collections: Collection[];
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
