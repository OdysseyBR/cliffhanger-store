import { Fragment, type ReactNode } from "react";
import type { Metadata } from "next";
import { ClubBanner } from "@/components/ClubBanner";
import { CollectionCard, UniverseCard, WorkCard } from "@/components/Cards";
import { Destaques } from "@/components/Destaques";
import { MenuButtons } from "@/components/MenuButtons";
import { Newsletter } from "@/components/Newsletter";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { ThemeBanner } from "@/components/ThemeBanner";
import { ThemeZones } from "@/components/ThemeZones";
import {
  bestSellers,
  getCatalog,
  launches,
  offers,
} from "@/lib/data";
import { HOME_SECTION_ORDER } from "@/lib/theme-css";
import { getActiveTheme } from "@/lib/themes";
import type { HomeSectionKey, Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cliffhanger Store — livros, e-books, audiobooks e colecionáveis",
};

/**
 * Theme Engine: revalida a cada 5 min para refletir o modelo ativo
 * (publicações e transições agendadas do Documento Mestre 4.6).
 */
export const revalidate = 300;

/**
 * Home — arquitetura fixa (Documento Mestre, seção 3):
 * BANNER → HEADER → MENU BUTTONS → DESTAQUES (side scroll) → restante.
 *
 * Banner, destaques e ordem/habilitação das seções vêm do modelo ativo
 * do Theme Engine (CMS da Home — 4.4).
 */
export default async function HomePage() {
  const [catalog, theme] = await Promise.all([getCatalog(), getActiveTheme()]);
  const { products, works, universes, authors, collections } = catalog;

  // 3.5 Destaques — curadoria do modelo ou seleção automática
  const autoDestaques = [
    ...bestSellers(products).slice(0, 6),
    ...launches(products).filter((p) => !bestSellers(products).includes(p)).slice(0, 4),
  ].slice(0, 10);

  const destaques: Product[] = theme.home.destaques.length
    ? theme.home.destaques
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p))
    : autoDestaques;

  // 3.6 Restante da Home — seções montadas a partir do catálogo
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
  const ofertas = offers(products).slice(0, 4);

  const grid = (items: Product[]) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );

  const grid4 = (items: Product[]) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );

  const sectionNodes: Record<HomeSectionKey, ReactNode> = {
    novidades:
      novidades.length > 0 ? (
        <Section title="Novidades" subtitle="O que acabou de chegar à loja." href="/lancamentos">
          {grid(novidades)}
        </Section>
      ) : null,
    "mais-vendidos":
      maisVendidos.length > 0 ? (
        <Section title="Mais vendidos" subtitle="Os campeões da temporada." href="/loja">
          {grid(maisVendidos)}
        </Section>
      ) : null,
    "pre-vendas":
      preVendas.length > 0 ? (
        <Section
          title="Pré-vendas"
          subtitle="Reserve agora, receba na data de lançamento."
          href="/lancamentos"
        >
          {grid4(preVendas)}
        </Section>
      ) : null,
    "edicoes-especiais":
      edicoesEspeciais.length > 0 ? (
        <Section
          title="Edições especiais"
          subtitle="Numeradas, limitadas e exclusivas da loja."
          href="/colecionaveis"
        >
          {grid4(edicoesEspeciais)}
        </Section>
      ) : null,
    universos: (
      <Section title="Explore os universos" subtitle="Cada universo, uma porta de entrada." href="/universos">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universes.map((universe) => (
            <UniverseCard key={universe.id} universe={universe} />
          ))}
        </div>
      </Section>
    ),
    derivados:
      derivados.length > 0 ? (
        <Section
          title="Produtos derivados"
          subtitle="Camisetas, canecas e posters dos universos."
          href="/produtos"
        >
          {grid4(derivados)}
        </Section>
      ) : null,
    editorial:
      editoriais.length > 0 ? (
        <Section
          title="Destaque editorial"
          subtitle="Obras selecionadas pela curadoria."
          href="/obras/valeharts-i-o-ultimo-farol"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {editoriais.map((work) => {
              const workProducts = products.filter((p) => p.workId === work.id);
              const starProduct =
                workProducts.find((p) => p.category === "livros") ?? workProducts[0];
              return (
                <WorkCard
                  key={work.id}
                  work={work}
                  authorName={authors.find((a) => a.id === work.authorId)?.name}
                  priceFrom={
                    workProducts.length > 0
                      ? Math.min(...workProducts.map((p) => p.price))
                      : undefined
                  }
                  rating={starProduct?.rating}
                  reviewCount={starProduct?.reviewCount}
                />
              );
            })}
          </div>
        </Section>
      ) : null,
    club: <ClubBanner />,
    newsletter: <Newsletter />,
    recomendacoes: (
      <Section title="Recomendações" subtitle="Com base nas avaliações da comunidade." href="/loja">
        {grid4(recomendacoes)}
      </Section>
    ),
    colecoes: (
      <Section title="Coleções" subtitle="Conjuntos montados para você." id="colecoes">
        <div className="grid gap-4 lg:grid-cols-2">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} products={products} />
          ))}
        </div>
      </Section>
    ),
    ofertas:
      ofertas.length > 0 ? (
        <Section title="Ofertas da semana" subtitle="Descontos por tempo limitado." href="/ofertas">
          {grid4(ofertas)}
        </Section>
      ) : null,
  };

  // ordem e habilitação das seções conforme o modelo ativo do CMS;
  // chaves ausentes ficam desativadas (lista vazia cai na ordem oficial 3.6)
  const orderedSections = theme.home.sections.length
    ? theme.home.sections
    : HOME_SECTION_ORDER.map((key) => ({ key, enabled: true }));

  // zonas novas (festivais sazonais) — vazio no modelo default
  const zones = theme.home.zones ?? [];

  return (
    <Page
      beforeHeader={<ThemeBanner banner={theme.home.banner} />}
      hideHeader={!theme.home.banner.showHeader}
    >
      {/* 3.4 Menu Buttons */}
      <MenuButtons />

      {/* zonas de festival — após Menu Buttons */}
      <ThemeZones zones={zones} placement="after-menu" />

      {/* 3.5 Destaques — side scroll horizontal */}
      <Destaques products={destaques} />

      {/* zonas de festival — após Destaques */}
      <ThemeZones zones={zones} placement="after-destaques" />

      {/* 3.6 Restante da Home (ordem vinda do CMS do Theme Engine) */}
      {orderedSections.map((section) =>
        section.enabled && sectionNodes[section.key] ? (
          <Fragment key={section.key}>{sectionNodes[section.key]}</Fragment>
        ) : null,
      )}

      {/* zonas de festival — fim da Home */}
      <ThemeZones zones={zones} placement="end" />
    </Page>
  );
}
