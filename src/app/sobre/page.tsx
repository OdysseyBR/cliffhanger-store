import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça a Cliffhanger Store: livros, e-books, audiobooks e colecionáveis oficiais dos universos Cliffhanger.",
};

/** Rota obrigatória §22 — página institucional da loja. */
export default function SobrePage() {
  return (
    <Page>
      <Section
        title="Sobre a Cliffhanger"
        subtitle="Uma loja de cultura pop feita por quem também é fã — do livro ao coleccionável."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4 p-6">
            <h2 className="text-display text-2xl">Nossa história</h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              A Cliffhanger Store nasceu para reunir, em um só lugar, tudo o que
              envolve os universos Cliffhanger: romances e HQs em capa dura,
              e-books, audiobooks, artbooks, boxes numeradas e produtos oficiais
              para o dia a dia dos leitores. Cada lançamento é pensado como uma
              experiência — da pré-venda ao desembalo.
            </p>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Somos movidos por histórias que terminam com um ponto de virada e
              deixam a pessoa sem fôlego. É por isso que o <strong>#FiqueNaBrisa</strong>{" "}
              virou nosso bordão: aquela sensação de ficar pendurado no cliffhanger
              do capítulo — e não conseguir largar o livro.
            </p>
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="text-display text-2xl">O que você encontra aqui</h2>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>• Livros físicos, HQs e edições especiais numeradas.</li>
              <li>• E-books e audiobooks com entrega digital imediata.</li>
              <li>• Colecionáveis oficiais: camisas, canecas, posters e boxes.</li>
              <li>• Pré-vendas com exemplar numerado e envio prioritário.</li>
              <li>• Cliffhanger Club: pontos, vantagens e acesso antecipado.</li>
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
                <p className="font-bold text-gold">Curadoria editorial</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Selecionamos cada obra, formato e acabamento com o mesmo cuidado
                  de uma editora independente.
                </p>
              </div>
              <div>
                <p className="font-bold text-gold">Entrega confiável</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Frete calculado no checkout, frete grátis a partir de R$ 199 e
                  rastreio a cada etapa do pedido.
                </p>
              </div>
              <div>
                <p className="font-bold text-gold">Comunidade primeiro</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Atendimento humano, trocas descomplicadas e conteúdo para quem
                  vive os universos além da página.
                </p>
              </div>
            </div>
            <p className="pt-2 text-xs text-[var(--text-muted)]">
              Site de demonstração — conteúdo e operação fictícios para o projeto
              Cliffhanger Store.
            </p>
          </div>
        </div>
      </Section>
    </Page>
  );
}
