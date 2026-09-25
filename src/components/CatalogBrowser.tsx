"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { IconX } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { categoryLabels, typeLabels } from "@/data/catalog";
import { formatPrice } from "@/lib/format";
import { badgeTone } from "@/lib/tones";
import type { Product, ProductCategory, ProductType } from "@/lib/types";
import type { FilterMaps } from "@/lib/filters";

type SortKey = "relevancia" | "menor" | "maior" | "avaliacao" | "novidades";

const sortLabels: Record<SortKey, string> = {
  relevancia: "Relevância",
  menor: "Menor preço",
  maior: "Maior preço",
  avaliacao: "Melhor avaliação",
  novidades: "Novidades",
};

type Formato = "livro" | "ebook" | "audiobook";
type Edicao = "especial" | "limitada" | "exclusiva";

const formatoLabels: Record<Formato, string> = {
  livro: "Livro físico",
  ebook: "E-book",
  audiobook: "Audiobook",
};

const edicaoLabels: Record<Edicao, string> = {
  especial: "Edição especial",
  limitada: "Limitada",
  exclusiva: "Exclusiva",
};

const avaliacaoLabels: Record<number, string> = {
  5: "5 estrelas",
  4: "4+ estrelas",
  3: "3+ estrelas",
};

const formatos = Object.keys(formatoLabels) as Formato[];
const edicoes = Object.keys(edicaoLabels) as Edicao[];
const avaliacoes = [5, 4, 3];

function formatOf(product: Product): Formato | null {
  switch (product.category) {
    case "livros":
      return "livro";
    case "ebooks":
      return "ebook";
    case "audiobooks":
      return "audiobook";
    default:
      return null;
  }
}

function editionOf(product: Product): Edicao | null {
  switch (product.badge) {
    case "EDIÇÃO ESPECIAL":
      return "especial";
    case "LIMITADO":
      return "limitada";
    case "EXCLUSIVO":
      return "exclusiva";
    default:
      return null;
  }
}

/** Grupo de pílulas do aside (universo, autor, formato, edição, avaliação). */
function PillGroup({
  title,
  options,
  active,
  onToggle,
  onClear,
}: {
  title: string;
  options: { value: string; label: string }[];
  active: string | null;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gold">{title}</p>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] transition hover:text-gold"
          >
            limpar
            <IconX className="h-3 w-3" />
            <span className="sr-only">limpar filtro de {title}</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active === option.value
                ? "border-transparent bg-violet text-white"
                : "border-[var(--border)] hover:border-violet-soft"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Navegador de catálogo: busca, filtros e ordenação no cliente
 * (Documento Mestre 6.3 — categoria, tipo, universo, autor, preço,
 * disponibilidade, formato, edição e avaliação).
 *
 * Filtros enviados por URL (?tipo=, ?badge=, ?universo=, ?autor=,
 * ?formato=, ?edicao=, ?avaliacao=) vêm do mega menu e do aside,
 * com chip de limpeza por parâmetro.
 */
export function CatalogBrowser({
  products,
  filterMaps,
  showCategories = true,
  fixedCategory,
  emptyMessage = "Nenhum produto encontrado com esses filtros.",
}: {
  products: Product[];
  filterMaps: FilterMaps;
  showCategories?: boolean;
  fixedCategory?: ProductCategory;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "todos">(
    fixedCategory ?? "todos",
  );
  const [sort, setSort] = useState<SortKey>("relevancia");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [inStock, setInStock] = useState(false);

  // Filtros por URL (Doc Mestre 6.3) — validados contra os dados do catálogo.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const lookups = useMemo(() => {
    const universeById = new Map(filterMaps.universes.map((u) => [u.id, u]));
    const universeBySlug = new Map(filterMaps.universes.map((u) => [u.slug, u]));
    const authorById = new Map(filterMaps.authors.map((a) => [a.id, a]));
    const authorBySlug = new Map(filterMaps.authors.map((a) => [a.slug, a]));
    const workById = new Map(filterMaps.works.map((w) => [w.id, w]));

    const universeSlugOf = (product: Product): string | null => {
      const universeId =
        product.universeId ??
        (product.workId ? workById.get(product.workId)?.universeId : undefined);
      return universeId ? (universeById.get(universeId)?.slug ?? null) : null;
    };
    const authorSlugOf = (product: Product): string | null => {
      const authorId =
        product.authorId ??
        (product.workId ? workById.get(product.workId)?.authorId : undefined);
      return authorId ? (authorById.get(authorId)?.slug ?? null) : null;
    };

    return { universeBySlug, authorBySlug, universeSlugOf, authorSlugOf };
  }, [filterMaps]);

  const rawTipo = searchParams.get("tipo");
  const rawBadge = searchParams.get("badge");
  const rawUniverso = searchParams.get("universo");
  const rawAutor = searchParams.get("autor");
  const rawFormato = searchParams.get("formato");
  const rawEdicao = searchParams.get("edicao");
  const rawAvaliacao = searchParams.get("avaliacao");

  const tipo = rawTipo && rawTipo in typeLabels ? (rawTipo as ProductType) : null;
  const badge = rawBadge && rawBadge in badgeTone ? rawBadge : null;
  const universo =
    rawUniverso && lookups.universeBySlug.has(rawUniverso) ? rawUniverso : null;
  const autor = rawAutor && lookups.authorBySlug.has(rawAutor) ? rawAutor : null;
  const formato = rawFormato && formatos.includes(rawFormato as Formato)
    ? (rawFormato as Formato)
    : null;
  const edicao = rawEdicao && edicoes.includes(rawEdicao as Edicao)
    ? (rawEdicao as Edicao)
    : null;
  const avaliacao =
    rawAvaliacao && avaliacoes.includes(Number(rawAvaliacao))
      ? Number(rawAvaliacao)
      : null;

  const hasMenuFilter = Boolean(tipo || badge);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return (Object.keys(categoryLabels) as ProductCategory[]).filter((c) => present.has(c));
  }, [products]);

  // Opções dos grupos do aside, derivadas dos produtos da página.
  const options = useMemo(() => {
    const universoSeen = new Map<string, string>();
    const autorSeen = new Map<string, string>();
    const formatoSeen = new Set<string>();
    const edicaoSeen = new Set<string>();

    for (const product of products) {
      const universeSlug = lookups.universeSlugOf(product);
      if (universeSlug && !universoSeen.has(universeSlug)) {
        universoSeen.set(
          universeSlug,
          lookups.universeBySlug.get(universeSlug)?.name ?? universeSlug,
        );
      }
      const authorSlug = lookups.authorSlugOf(product);
      if (authorSlug && !autorSeen.has(authorSlug)) {
        autorSeen.set(authorSlug, lookups.authorBySlug.get(authorSlug)?.name ?? authorSlug);
      }
      const format = formatOf(product);
      if (format) formatoSeen.add(format);
      const edition = editionOf(product);
      if (edition) edicaoSeen.add(edition);
    }

    return {
      universo: [...universoSeen].map(([value, label]) => ({ value, label })),
      autor: [...autorSeen].map(([value, label]) => ({ value, label })),
      formato: formatos
        .filter((f) => formatoSeen.has(f))
        .map((value) => ({ value, label: formatoLabels[value] })),
      edicao: edicoes
        .filter((e) => edicaoSeen.has(e))
        .map((value) => ({ value, label: edicaoLabels[value] })),
      avaliacao: avaliacoes.map((value) => ({
        value: String(value),
        label: avaliacaoLabels[value],
      })),
    };
  }, [products, lookups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      if (fixedCategory && p.category !== fixedCategory) return false;
      if (tipo && p.type !== tipo) return false;
      if (badge && p.badge !== badge) return false;
      if (universo && lookups.universeSlugOf(p) !== universo) return false;
      if (autor && lookups.authorSlugOf(p) !== autor) return false;
      if (formato && formatOf(p) !== formato) return false;
      if (edicao && editionOf(p) !== edicao) return false;
      if (avaliacao && p.rating < avaliacao) return false;
      if (category !== "todos" && p.category !== category) return false;
      if (onlyOffers && !(p.compareAt && p.compareAt > p.price)) return false;
      if (inStock && p.stock === 0 && !p.digital) return false;
      if (q && !`${p.title} ${p.description} ${p.type}`.toLowerCase().includes(q)) return false;
      return true;
    });

    list = [...list];
    switch (sort) {
      case "menor":
        list.sort((a, b) => a.price - b.price);
        break;
      case "maior":
        list.sort((a, b) => b.price - a.price);
        break;
      case "avaliacao":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "novidades":
        list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        break;
      default:
        list.sort((a, b) => (a.salesRank ?? 99) - (b.salesRank ?? 99));
    }
    return list;
  }, [
    products,
    query,
    category,
    sort,
    onlyOffers,
    inStock,
    fixedCategory,
    tipo,
    badge,
    universo,
    autor,
    formato,
    edicao,
    avaliacao,
    lookups,
  ]);

  // atualiza a URL preservando os demais parâmetros (scroll no lugar)
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleParam = (key: string, value: string) => {
    setParam(key, searchParams.get(key) === value ? null : value);
  };

  const hrefWithout = (keys: string[]) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of keys) next.delete(key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  // chips de todos os filtros ativos na URL (limpeza individual por chip)
  const chips: { key: string; label: string; tone: string }[] = [];
  if (tipo) chips.push({ key: "tipo", label: `Tipo: ${typeLabels[tipo]}`, tone: "violet" });
  if (badge) chips.push({ key: "badge", label: badge, tone: "gold" });
  if (universo) {
    chips.push({
      key: "universo",
      label: `Universo: ${lookups.universeBySlug.get(universo)?.name ?? universo}`,
      tone: "neutral",
    });
  }
  if (autor) {
    chips.push({
      key: "autor",
      label: `Autor: ${lookups.authorBySlug.get(autor)?.name ?? autor}`,
      tone: "neutral",
    });
  }
  if (formato) {
    chips.push({ key: "formato", label: `Formato: ${formatoLabels[formato]}`, tone: "neutral" });
  }
  if (edicao) {
    chips.push({ key: "edicao", label: `Edição: ${edicaoLabels[edicao]}`, tone: "neutral" });
  }
  if (avaliacao) {
    chips.push({
      key: "avaliacao",
      label: `Avaliação: ${avaliacaoLabels[avaliacao]}`,
      tone: "neutral",
    });
  }
  const hasUrlFilter = chips.length > 0;

  const chipTone = (tone: string) =>
    tone === "violet"
      ? "border-violet/50 bg-violet/10"
      : tone === "gold"
        ? "border-gold/50 bg-gold/10"
        : "border-[var(--border)] bg-[var(--surface-raised)]";

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      {/* filtros */}
      <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
        <div>
          <label htmlFor="catalog-search" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gold">
            Buscar
          </label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: valeharts, caneca…"
            className="field"
          />
        </div>

        {showCategories && !fixedCategory && categories.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Categoria</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("todos")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  category === "todos"
                    ? "border-transparent bg-violet text-white"
                    : "border-[var(--border)] hover:border-violet-soft"
                }`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    category === c
                      ? "border-transparent bg-violet text-white"
                      : "border-[var(--border)] hover:border-violet-soft"
                  }`}
                >
                  {categoryLabels[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Doc 6.3 — universo, autor, formato, edição */}
        <PillGroup
          title="Universo"
          options={options.universo}
          active={universo}
          onToggle={(value) => toggleParam("universo", value)}
          onClear={() => setParam("universo", null)}
        />
        <PillGroup
          title="Autor"
          options={options.autor}
          active={autor}
          onToggle={(value) => toggleParam("autor", value)}
          onClear={() => setParam("autor", null)}
        />
        <PillGroup
          title="Formato"
          options={options.formato}
          active={formato}
          onToggle={(value) => toggleParam("formato", value)}
          onClear={() => setParam("formato", null)}
        />
        <PillGroup
          title="Edição"
          options={options.edicao}
          active={edicao}
          onToggle={(value) => toggleParam("edicao", value)}
          onClear={() => setParam("edicao", null)}
        />

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Status</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyOffers}
              onChange={(e) => setOnlyOffers(e.target.checked)}
              className="h-4 w-4 accent-[#5603AD]"
            />
            Somente ofertas
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="h-4 w-4 accent-[#5603AD]"
            />
            Pronta entrega
          </label>
        </div>

        {/* Doc 6.3 — avaliação */}
        <PillGroup
          title="Avaliação"
          options={options.avaliacao}
          active={avaliacao ? String(avaliacao) : null}
          onToggle={(value) => toggleParam("avaliacao", value)}
          onClear={() => setParam("avaliacao", null)}
        />

        <div>
          <label htmlFor="catalog-sort" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gold">
            Ordenar por
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="field"
          >
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
          <strong className="text-gold">{filtered.length}</strong> produto
          {filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}.
        </div>
      </aside>

      {/* resultados */}
      <div>
        {hasUrlFilter && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-gold">
              {hasMenuFilter ? "Filtro do menu:" : "Filtros ativos:"}
            </span>
            {chips.map((chip) => (
              <Link
                key={chip.key}
                href={hrefWithout([chip.key])}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${chipTone(chip.tone)}`}
              >
                {chip.label}
                <IconX className="h-3.5 w-3.5" />
                <span className="sr-only">limpar filtro de {chip.key}</span>
              </Link>
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="card grid place-items-center gap-3 p-12 text-center">
            <p className="text-display text-3xl">Nada por aqui</p>
            <p className="text-sm text-[var(--text-muted)]">
              {hasUrlFilter
                ? "Nenhum item com esse filtro no catálogo por enquanto."
                : emptyMessage}
            </p>
            <Link href={hasUrlFilter ? pathname : "/loja"} className="btn btn-primary">
              {hasUrlFilter ? "Limpar filtro" : "Ver toda a loja"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Resumo de preço para páginas de categoria. */
export function PriceRange({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  const prices = products.map((p) => p.price);
  return (
    <p className="text-sm text-[var(--text-muted)]">
      De <strong className="text-gold">{formatPrice(Math.min(...prices))}</strong> a{" "}
      <strong className="text-gold">{formatPrice(Math.max(...prices))}</strong>
    </p>
  );
}
