import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audiobook",
  description: "Ouça seus audiobooks com capítulos, marcadores e progresso salvo.",
};

export default function AudiobookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
