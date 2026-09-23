import type { Metadata } from "next";
import { Banner } from "@/components/Banner";
import { ClubBanner } from "@/components/ClubBanner";
import { CollectionCard, UniverseCard, WorkCard } from "@/components/Cards";
import { Destaques } from "@/components/Destaques";
import { MenuButtons } from "@/components/MenuButtons";
import { Newsletter } from "@/components/Newsletter";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import {
  bestSellers,
  getCatalog,
  launches,
  offers,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Cliffhanger Store — livros, e-books, audiobooks e colecionáveis",
};

/**
 * Home — arquitetura fixa (Documento Mestre, seção 3):
 * BANNER → HEADER → MENU BUTTONS → DESTAQUES (side scroll) → restante.
 */
export default async function HomePage() {
  const catalog = await getCatalog();
  const { products, works, universes, authors, collections } = catalog;

  const destaques = [
    ...bestSellers(products).slice(0, 6),
    ...launches(products).filter((p) => !bestSellers(products).includes(p)).slice(0, 4),
  ].slice(0, 10);

  const novidades = launches(products).slice(0, 8);
  const maisVendidos = bestSellers(products).slice(0, 8);
  const preVendas = products.filter((p) => p.badge === "PRÉ-VENDA").slice(0, 4);
  const edicoesEspeciais = products
    .filter((p) => p.badge === "EDIÇÃO ESPECIAL" || p.badge === "LIMITADO" || p.badge === "EXCLUSIVO")
    .slice(0, 4);
  const derivados = products.filter((p) => p.category === "produtos").slice(0, 4);
  const recomendacoes = [...products]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);
  const editoriais = works.slice(0, 4);

  return (
    <Page beforeHeader={<Banner />}>
      {/* 3.4 Menu Buttons */}
      <MenuButtons />

      {/* 3.5 Destaques — side scroll horizontal */}
      <Destaques products={destaques} />

      {/* 3.6 Restante da Home */}
      {novidades.length > 0 && (
        <Section title="Novidades" subtitle="O que acabou de chegar à loja." href="/lancamentos">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {novidades.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {maisVendidos.length > 0 && (
        <Section title="Mais vendidos" subtitle="Os campeões da temporada." href="/loja">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {maisVendidos.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {preVendas.length > 0 && (
        <Section
          title="Pré-vendas"
          subtitle="Reserve agora, receba na data de lançamento."
          href="/lancamentos"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {preVendas.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Explore os universos" subtitle="Cada universo, uma porta de entrada." href="/universos">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universes.map((universe) => (
            <UniverseCard key={universe.id} universe={universe} />
          ))}
        </div>
      </Section>

      {editoriais.length > 0 && (
        <Section title="Destaque editorial" subtitle="Obras selecionadas pela curadoria." href="/obras/valeharts-i-o-ultimo-farol">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {editoriais.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                authorName={authors.find((a) => a.id === work.authorId)?.name}
              />
            ))}
          </div>
        </Section>
      )}

      {derivados.length > 0 && (
        <Section title="Produtos derivados" subtitle="Camisetas, canecas e posters dos universos." href="/produtos">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {derivados.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {edicoesEspeciais.length > 0 && (
        <Section title="Edições especiais" subtitle="Numeradas, limitadas e exclusivas da loja." href="/colecionaveis">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {edicoesEspeciais.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Coleções" subtitle="Conjuntos montados para você." id="colecoes">
        <div className="grid gap-4 lg:grid-cols-2">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} products={products} />
          ))}
        </div>
      </Section>

      <ClubBanner />

      <Newsletter />

      <Section title="Recomendações" subtitle="Com base nas avaliações da comunidade." href="/loja">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {recomendacoes.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Section>

      {offers(products).length > 0 && (
        <Section title="Ofertas da semana" subtitle="Descontos por tempo limitado." href="/ofertas">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {offers(products).slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
