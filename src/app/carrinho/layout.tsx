import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carrinho",
  description: "Seu carrinho na Litterae.",
};

export default function CarrinhoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
