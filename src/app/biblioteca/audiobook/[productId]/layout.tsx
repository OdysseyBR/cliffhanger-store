import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audiolivro",
  description: "Ouça seus audiolivros com capítulos, marcadores e progresso salvo.",
};

export default function AudiobookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
