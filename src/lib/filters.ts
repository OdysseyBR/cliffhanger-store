import type { Catalog } from "@/lib/types";

/**
 * Listas enxutas resolvidas no servidor e passadas ao navegador de catálogo
 * (Doc Mestre 6.3 — filtros por URL de universo, autor e obras).
 *
 * Fica num módulo neutro (sem "use client") para poder ser chamado tanto
 * pelas páginas server quanto consumido como tipo no cliente.
 */
export interface FilterMaps {
  universes: { id: string; slug: string; name: string }[];
  authors: { id: string; slug: string; name: string }[];
  works: { id: string; authorId: string; universeId: string }[];
}

/** Projeção enxuta do catálogo para o navegador (evita passar o catálogo inteiro). */
export function buildFilterMaps(catalog: Catalog): FilterMaps {
  return {
    universes: catalog.universes.map(({ id, slug, name }) => ({ id, slug, name })),
    authors: catalog.authors.map(({ id, slug, name }) => ({ id, slug, name })),
    works: catalog.works.map(({ id, authorId, universeId }) => ({
      id,
      authorId,
      universeId,
    })),
  };
}
