import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minha conta",
  description: "Entrar ou criar sua conta Cliffhanger (Google, Facebook ou e-mail).",
};

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
