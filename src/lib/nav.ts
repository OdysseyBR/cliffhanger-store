export interface NavItem {
  label: string;
  href: string;
}

/** Menu Buttons da Home (Documento Mestre, seção 3.4). */
export const menuButtons: NavItem[] = [
  { label: "Loja", href: "/loja" },
  { label: "Livros", href: "/livros" },
  { label: "E-books", href: "/ebooks" },
  { label: "Audiobooks", href: "/audiobooks" },
  { label: "Produtos", href: "/produtos" },
  { label: "Colecionáveis", href: "/colecionaveis" },
  { label: "Universos", href: "/universos" },
  { label: "Autores", href: "/autores" },
  { label: "Lançamentos", href: "/lancamentos" },
  { label: "Ofertas", href: "/ofertas" },
];

/** Navegação principal (Documento Mestre, seção 6.1). */
export const mainNav: NavItem[] = [
  { label: "Início", href: "/" },
  ...menuButtons,
  { label: "Buscar", href: "/buscar" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Carrinho", href: "/carrinho" },
  { label: "Biblioteca", href: "/biblioteca" },
  { label: "Minha conta", href: "/conta" },
];

/** Mega menu (Documento Mestre, seção 6.2). */
export const megaMenu: { title: string; items: NavItem[] }[] = [
  {
    title: "Literatura",
    items: [
      { label: "Livros", href: "/livros" },
      { label: "E-books", href: "/ebooks" },
      { label: "Audiobooks", href: "/audiobooks" },
      { label: "HQs", href: "/livros?tipo=hq" },
      { label: "Artbooks", href: "/livros?tipo=artbook" },
    ],
  },
  {
    title: "Produtos",
    items: [
      { label: "Camisas", href: "/produtos?tipo=camisa" },
      { label: "Canecas", href: "/produtos?tipo=caneca" },
      { label: "Posters", href: "/produtos?tipo=poster" },
      { label: "Marcadores", href: "/produtos?tipo=marcador" },
      { label: "Adesivos", href: "/produtos?tipo=adesivo" },
      { label: "Colecionáveis", href: "/colecionaveis" },
    ],
  },
  {
    title: "Edições",
    items: [
      { label: "Deluxe", href: "/livros?badge=EDIÇÃO ESPECIAL" },
      { label: "Limitadas", href: "/colecionaveis" },
      { label: "Boxes", href: "/colecionaveis?tipo=box" },
      { label: "Numeradas", href: "/colecionaveis" },
    ],
  },
  {
    title: "Explorar",
    items: [
      { label: "Universos", href: "/universos" },
      { label: "Autores", href: "/autores" },
      { label: "Coleções", href: "/loja#colecoes" },
      { label: "Lançamentos", href: "/lancamentos" },
    ],
  },
];

export const footerLinks: { title: string; items: NavItem[] }[] = [
  {
    title: "Loja",
    items: [
      { label: "Todos os produtos", href: "/loja" },
      { label: "Livros", href: "/livros" },
      { label: "E-books", href: "/ebooks" },
      { label: "Audiobooks", href: "/audiobooks" },
      { label: "Colecionáveis", href: "/colecionaveis" },
      { label: "Ofertas", href: "/ofertas" },
    ],
  },
  {
    title: "Explorar",
    items: [
      { label: "Universos", href: "/universos" },
      { label: "Autores", href: "/autores" },
      { label: "Lançamentos", href: "/lancamentos" },
      { label: "Buscar", href: "/buscar" },
    ],
  },
  {
    title: "Conta",
    items: [
      { label: "Minha conta", href: "/conta" },
      { label: "Biblioteca", href: "/biblioteca" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Carrinho", href: "/carrinho" },
    ],
  },
];
