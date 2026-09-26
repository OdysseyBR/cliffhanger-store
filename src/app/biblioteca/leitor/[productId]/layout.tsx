import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leitor de e-book",
  description: "Leia seus e-books com capítulos, marcadores e progresso salvo.",
};

export default function LeitorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
