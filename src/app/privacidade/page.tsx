import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "Política de privacidade da Cliffhanger Store: dados coletados, uso, compartilhamento e seus direitos (LGPD).",
};

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "1. Dados que coletamos",
    paragraphs: [
      "Cadastro: nome, e-mail e senha (armazenada de forma criptografada no Firebase Authentication).",
      "Pedidos: endereço de entrega, telefone, itens comprados e status do pagamento.",
      "Navegação: preferência de padrão visual, conteúdo do carrinho e wishlist salvos no seu navegador.",
    ],
  },
  {
    title: "2. Como usamos seus dados",
    paragraphs: [
      "Para processar pagamentos, separar pedidos e entregar compras físicas e digitais.",
      "Para criar sua biblioteca digital, histórico de pedidos e vantagens do Cliffhanger Club.",
      "Para enviar comunicações do pedido (confirmação, rastreio) e, se você aceitar, novidades da loja.",
    ],
  },
  {
    title: "3. Compartilhamento",
    paragraphs: [
      "Compartilhamos apenas o necessário com meios de pagamento, transportadoras e serviços de mídia (Cloudinary) sob contrato.",
      "Nunca vendemos dados pessoais a terceiros.",
    ],
  },
  {
    title: "4. Seus direitos (LGPD)",
    paragraphs: [
      "Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo canal de contato da loja.",
      "A exclusão da conta em Minha conta remove perfil, wishlist e dados vinculados; pedidos já realizados são mantidos por obrigação legal.",
    ],
  },
  {
    title: "5. Cookies e armazenamento local",
    paragraphs: [
      "Usamos cookies e armazenamento local para manter sua sessão, carrinho e preferências visuais.",
      "Você pode limpar esses dados nas configurações do seu navegador — sua sessão e o carrinho serão perdidos.",
    ],
  },
];

/** Rota obrigatória §22 — política de privacidade. */
export default function PrivacidadePage() {
  return (
    <Page>
      <Section
        title="Política de privacidade"
        subtitle="Transparência sobre os dados da sua conta Cliffhanger — em linguagem simples."
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title} className="card p-6">
              <h2 className="text-display text-2xl text-gold">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {section.paragraphs.map((paragraph) => (
                  <li key={paragraph}>• {paragraph}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
            <p className="text-xs text-[var(--text-muted)]">
              Última atualização: setembro de 2026 · Site de demonstração.
            </p>
            <Link href="/contato" className="btn btn-ghost px-5">
              Falar sobre meus dados
            </Link>
          </div>
        </div>
      </Section>
    </Page>
  );
}
