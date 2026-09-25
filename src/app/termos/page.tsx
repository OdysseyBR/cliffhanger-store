import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Termos de uso e condições de compra da Cliffhanger Store.",
};

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "1. Aceitação",
    paragraphs: [
      "Ao navegar ou comprar na Cliffhanger Store você concorda com estes termos. Se discordar de algum ponto, não utilize a loja.",
    ],
  },
  {
    title: "2. Conta do usuário",
    paragraphs: [
      "Você é responsável pela segurança das suas credenciais e por todas as atividades realizadas na sua conta.",
      "Informações verdadeiras são obrigatórias no cadastro e no checkout — elas alimentam a entrega e a nota fiscal.",
    ],
  },
  {
    title: "3. Preços, pagamentos e promoções",
    paragraphs: [
      "Preços em reais, sujeitos a alteração sem aviso prévio; o valor válido é o exibido no momento da compra.",
      "Cupons e promoções não são cumulativos salvo indicação em contrário e podem ter prazo de validade.",
      "Pagamentos por PIX e cartão são processados por parceiros; a aprovação confirma o pedido.",
    ],
  },
  {
    title: "4. Entrega, trocas e desistência",
    paragraphs: [
      "Prazos de envio e entrega são estimativas — avarias ou trocas devem ser comunicadas em até 7 dias após o recebimento.",
      "Produtos digitais (e-books, audiobooks) têm acesso liberado após a aprovação do pagamento, em Minha biblioteca.",
    ],
  },
  {
    title: "5. Propriedade intelectual",
    paragraphs: [
      "Marcas, capas, ilustrações e textos dos universos Cliffhanger pertencem aos seus titulares. A reprodução comercial é proibida.",
      "Comprar um e-book concede uso pessoal e intransferível — não autoriza redistribuição.",
    ],
  },
  {
    title: "6. Contato",
    paragraphs: [
      "Dúvidas sobre estes termos podem ser enviadas pelo canal de contato da loja. Estes termos são atualizados quando a operação muda.",
    ],
  },
];

/** Rota obrigatória §22 — termos de uso e condições de compra. */
export default function TermosPage() {
  return (
    <Page>
      <Section
        title="Termos de uso"
        subtitle="Regras da loja, da conta e das compras — claras e sem letra miúda."
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
            <Link href="/sobre" className="btn btn-ghost px-5">
              Conhecer a loja
            </Link>
          </div>
        </div>
      </Section>
    </Page>
  );
}
