import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * P1.2 — sitemap.xml: rotas públicas estáticas + páginas de detalhe
 * derivadas do catálogo (universos, autores, obras, lançamentos e produtos).
 * A leitura do catálogo propaga falha como no resto da loja (P0.1).
 */
const ESTATICAS: MetadataRoute.Sitemap = [
  { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
  { url: `${siteUrl}/loja`, changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/livros`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/ebooks`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/audiobooks`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/produtos`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/colecionaveis`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/universos`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/autores`, changeFrequency: "weekly", priority: 0.7 },
  { url: `${siteUrl}/lancamentos`, changeFrequency: "daily", priority: 0.8 },
  { url: `${siteUrl}/ofertas`, changeFrequency: "daily", priority: 0.7 },
  { url: `${siteUrl}/download`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${siteUrl}/contato`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${siteUrl}/sobre`, changeFrequency: "yearly", priority: 0.5 },
  { url: `${siteUrl}/termos`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${siteUrl}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();

  const detalhes = [
    ...catalog.universes.map((u) => `/universos/${u.slug}`),
    ...catalog.authors.map((a) => `/autores/${a.slug}`),
    ...catalog.works.map((w) => `/obras/${w.slug}`),
    ...catalog.launches.map((l) => `/lancamentos/${l.slug}`),
    ...catalog.products.map((p) => `/produtos/${p.slug}`),
  ];

  return [
    ...ESTATICAS,
    ...detalhes.map(
      (path): MetadataRoute.Sitemap[number] => ({
        url: `${siteUrl}${path}`,
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    ),
  ];
}
