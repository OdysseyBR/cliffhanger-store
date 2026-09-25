import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Entre na sua conta Cliffhanger com Google, Facebook ou e-mail e senha.",
};

/** Rota obrigatória §22 — login de qualquer visitante (não confundir com /admin). */
export default function LoginPage() {
  return (
    <Page>
      <Section
        title="Entrar"
        subtitle="Acesse loja, biblioteca, wishlist e pedidos com uma única conta Cliffhanger."
      >
        <div className="card mx-auto max-w-md p-6">
          <AuthCard initialMode="entrar" />
        </div>
      </Section>
    </Page>
  );
}
