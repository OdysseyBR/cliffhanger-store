import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Dúvidas sobre pedidos, entrega, contas, e-books, audiobooks, pré-vendas e Cliffhanger Club.",
};

interface FaqItem {
  q: string;
  a: string;
}

const GROUPS: { title: string; items: FaqItem[] }[] = [
  {
    title: "Pedidos e entrega",
    items: [
      {
        q: "Como acompanho meu pedido?",
        a: "Entre na sua conta e acesse Meus pedidos (/pedidos): cada pedido mostra o código CH-xxxx, o status (aguardando pagamento, em separação, enviado, entregue) e os valores.",
      },
      {
        q: "Qual é o prazo de envio?",
        a: "Pedidos aprovados saem em até 2 dias úteis. O prazo de entrega depende do CEP e é calculado no checkout, junto do frete. Pré-vendas seguem a data de envio informada na página do produto.",
      },
      {
        q: "Existe frete grátis?",
        a: "Sim — compras físicas a partir de R$ 199 têm frete grátis para todo o Brasil. O progresso do carrinho mostra quanto falta para liberar.",
      },
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "PIX e cartão de crédito ou débito. A compra só é confirmada após a aprovação do pagamento.",
      },
    ],
  },
  {
    title: "Conta e segurança",
    items: [
      {
        q: "Preciso de conta para comprar?",
        a: "Não — dá para comprar como visitante informando o e-mail. Com conta, você acompanha pedidos, histórico e biblioteca em qualquer dispositivo.",
      },
      {
        q: "Esqueci minha senha",
        a: "Acesse Recuperar senha (/recuperacao-de-senha), informe seu e-mail e enviaremos um link para criar uma nova senha. O link expira em alguns minutos.",
      },
      {
        q: "Posso entrar com Google ou Facebook?",
        a: "Sim. Os três métodos (Google, Facebook, e-mail e senha) apontam para a mesma Cliffhanger Account — você escolhe o mais conveniente.",
      },
    ],
  },
  {
    title: "E-books, audiobooks e clube",
    items: [
      {
        q: "Como recebo meu e-book?",
        a: "Assim que o pagamento é aprovado, o título aparece em Minha biblioteca para leitura na web — sem esperar envio físico.",
      },
      {
        q: "Audiobooks funcionam em quais aparelhos?",
        a: "Na versão atual, o player roda direto no navegador da loja, em computador, tablet e celular — basta estar logado.",
      },
      {
        q: "O que é o Cliffhanger Club?",
        a: "É o programa de fidelidade: você acumula pontos a cada compra e libera vantagens como acesso antecipado a pré-vendas e edições limitadas.",
      },
    ],
  },
];

function FaqGroup({ group }: { group: (typeof GROUPS)[number] }) {
  return (
    <div className="card p-6">
      <h2 className="text-display mb-4 text-2xl text-gold">{group.title}</h2>
      <div className="space-y-3">
        {group.items.map((item) => (
          <details key={item.q} className="group rounded-xl border border-[var(--border)] px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-bold marker:hidden">
              <span className="mr-2 inline-block text-gold transition group-open:rotate-90">›</span>
              {item.q}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-relaxed text-[var(--text-muted)]">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Rota obrigatória §22 — FAQ com estados nativos acessíveis. */
export default function FaqPage() {
  return (
    <Page>
      <Section
        title="Perguntas frequentes"
        subtitle="Pedidos, entrega, contas e conteúdo digital — em um minuto você resolve."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {GROUPS.map((group) => (
            <FaqGroup key={group.title} group={group} />
          ))}
          <div className="card flex flex-wrap items-center justify-between gap-3 p-6 lg:col-span-2">
            <p className="text-sm text-[var(--text-muted)]">
              Não achou o que precisava? Nosso suporte responde em até 1 dia útil.
            </p>
            <Link href="/contato" className="btn btn-primary px-5">
              Falar com o suporte
            </Link>
          </div>
        </div>
      </Section>
    </Page>
  );
}
