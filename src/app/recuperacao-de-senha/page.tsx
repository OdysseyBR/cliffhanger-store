import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description:
    "Receba um link por e-mail para redefinir a senha da sua conta Cliffhanger.",
};

/** Rota obrigatória §22 — recuperação de senha de contas com e-mail/senha. */
export default function RecuperacaoDeSenhaPage() {
  return (
    <Page>
      <Section
        title="Recuperar senha"
        subtitle="Enviamos um link seguro por e-mail — ele expira em alguns minutos."
      >
        <div className="card mx-auto max-w-md p-6">
          <AuthCard initialMode="recuperar" />
        </div>
      </Section>
    </Page>
  );
}
