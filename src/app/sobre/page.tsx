import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça a Litterae: livraria digital de autores independentes — livros, e-books e audiolivros de autores menores, com publicação acessível para quem quer criar livros digitais.",
};

/** Rota obrigatória §22 — página institucional da livraria. */
export default function SobrePage() {
  return (
    <Page>
      <Section
        title="Sobre a Litterae"
        titleAs="h1"
        subtitle="Uma livraria digital feita para autores independentes e para quem ama descobrir histórias novas."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4 p-6">
            <h2 className="text-display text-2xl">Nossa história</h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              A Litterae é uma livraria digital onde obras de autores menores
              encontram leitores — e onde qualquer pessoa pode publicar os
              próprios livros digitais. Aqui convivem e-books e audiolivros de
              autores independentes com os títulos dos nossos universos,
              edições especiais e pré-vendas. Uma conta, toda a biblioteca.
            </p>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Acreditamos que toda boa história merece uma chance de ser
              encontrada. É por isso que o <strong>#AbraUmLivro</strong>{" "}
              virou nosso bordão: abrir mais uma página é onde tudo começa —
              para quem lê e para quem escreve.
            </p>
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="text-display text-2xl">O que você encontra aqui</h2>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>• E-books e audiolivros de autores independentes, com leitura e escuta no app e no navegador.</li>
              <li>• Livros físicos, edições especiais numeradas e pré-vendas.</li>
              <li>• Produtos oficiais: camisas, canecas, posters e boxes.</li>
              <li>• Publicação para autores: crie sua conta e leve seu livro digital ao leitor.</li>
              <li>• Clube Litterae: pontos, vantagens e acesso antecipado.</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/loja" className="btn btn-primary px-5">
                Ver a loja
              </Link>
              <Link href="/lancamentos" className="btn btn-ghost px-5">
                Lançamentos
              </Link>
            </div>
          </div>

          <div className="card space-y-3 p-6 lg:col-span-2">
            <h2 className="text-display text-2xl">Como trabalhamos</h2>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="font-bold text-gold">Curadoria independente</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Selecionamos cada obra com o cuidado de uma editora
                  independente — do autor consagrado ao estreante.
                </p>
              </div>
              <div>
                <p className="font-bold text-gold">Entrega confiável</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Frete calculado no checkout, frete grátis a partir de R$ 199 e
                  rastreio a cada etapa do pedido. Digitais, na hora.
                </p>
              </div>
              <div>
                <p className="font-bold text-gold">Comunidade primeiro</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Atendimento humano, trocas descomplicadas e um público que
                  vive os universos além da página.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </Page>
  );
}
