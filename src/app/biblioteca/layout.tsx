import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biblioteca",
  description: "Sua biblioteca digital: e-books e audiobooks comprados.",
};

export default function BibliotecaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
