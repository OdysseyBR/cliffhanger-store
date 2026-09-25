import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Crie sua conta Cliffhanger: biblioteca digital, wishlist, clube e histórico de pedidos.",
};

/** Rota obrigatória §22 — cadastro de novos leitores. */
export default function CadastroPage() {
  return (
    <Page>
      <Section
        title="Criar conta"
        subtitle="Uma única conta para loja, biblioteca, wishlist e Cliffhanger Club."
      >
        <div className="card mx-auto max-w-md p-6">
          <AuthCard initialMode="criar" />
        </div>
      </Section>
    </Page>
  );
}
