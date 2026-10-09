"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { TextInput } from "@/components/admin/form-fields";
import { deleteProduct } from "@/components/admin/admin-api";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { DigitalProductsModule } from "@/components/admin/DigitalProductsModule";
import { formatPrice } from "@/lib/format";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/product-fields";
import type { Product } from "@/lib/types";

/**
 * Visão cliente de Produtos (Doc Mestre 11.1) com as abas por tipo da
 * Etapa T (Livros, E-books, Audiobooks, Camisetas, Canecas etc.); o
 * deep-link `?tipo=` chega como prop da rota server (`page.tsx`). As
 * abas E-books e Audiobooks abrem o editor de conteúdo digital embutido
 * (arquivo, sumário e download); os demais filtros caem na lista
 * genérica por `category`/`type` — as 5 categorias e os 13 tipos do
 * modelo estão cobertos.
 */

type TabKey =
  | ""
  | "livros"
  | "ebook"
  | "audiobook"
  | "camisa"
  | "caneca"
  | "poster"
  | "marcador"
  | "adesivo"
  | "print"
  | "box"
  | "colecionaveis";

const TABS: { key: TabKey; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "livros", label: "Livros" },
  { key: "ebook", label: "E-books" },
  { key: "audiobook", label: "Audiobooks" },
  { key: "camisa", label: "Camisetas" },
  { key: "caneca", label: "Canecas" },
  { key: "poster", label: "Pôsteres" },
  { key: "marcador", label: "Marcadores" },
  { key: "adesivo", label: "Adesivos" },
  { key: "print", label: "Prints" },
  { key: "box", label: "Boxes" },
  { key: "colecionaveis", label: "Colecionáveis" },
];

/** Valor vindo da URL só vale se for uma aba conhecida. */
function normalizar(valor: string): TabKey {
  return (TABS.some((tab) => tab.key === valor) ? valor : "") as TabKey;
}

/** Filtro por aba — categorias inteiras ou tipos avulsos do modelo. */
function corresponde(product: Product, tab: TabKey): boolean {
  if (!tab) return true;
  if (tab === "livros" || tab === "colecionaveis") return product.category === tab;
  return product.type === tab;
}

function typeLabel(product: Product): string {
  return (
    PRODUCT_TYPE_OPTIONS.find((option) => option.value === product.type)?.label ?? product.type
  );
}

export function ProdutosView({ tipo }: { tipo: string }) {
  const { user, notify } = useStore();
  const { products, loading, error, reload } = useAdminProducts();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const tab = normalizar(tipo);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        corresponde(product, tab) &&
        (!q || product.title.toLowerCase().includes(q) || product.slug.includes(q)),
    );
  }, [products, query, tab]);

  async function handleDelete(product: Product) {
    if (!window.confirm(`Excluir "${product.title}"? A loja para de exibi-lo imediatamente.`)) {
      return;
    }
    setBusyId(product.id);
    const result = await deleteProduct(product.id);
    setBusyId(null);
    if (result.ok) {
      notify("Item excluído", "success");
      reload();
    } else {
      notify(result.message, "error");
    }
  }

  if (!user) return <AdminLogin note="Entre com a conta administradora para gerenciar os itens." />;

  const digital = tab === "ebook" || tab === "audiobook";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Produtos</p>
          <p className="text-xs text-[var(--text-muted)]">
            Criador de itens — literatura e produtos (Doc Mestre 11.2)
            {products ? ` · ${products.length} cadastrados` : ""}
          </p>
        </div>
        <Link href="/admin/produtos/novo" className="btn btn-primary px-4 py-2 text-[11px]">
          Novo item
        </Link>
      </div>

      <div
        className="flex flex-wrap gap-1.5 border-b border-[var(--border)] pb-4"
        role="tablist"
        aria-label="Tipos de produto"
      >
        {TABS.map((item) => (
          <Link
            key={item.key || "todos"}
            href={item.key ? `/admin/produtos?tipo=${item.key}` : "/admin/produtos"}
            role="tab"
            aria-selected={tab === item.key}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === item.key
                ? "bg-gold text-ink"
                : "border border-[var(--border)] text-[var(--text-muted)] hover:border-gold hover:text-gold"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {digital ? (
        <DigitalProductsModule kind={tab === "ebook" ? "pdf" : "audio"} embedded />
      ) : (
        <>
          <TextInput value={query} onChange={setQuery} placeholder="Buscar por título ou slug…" />

          {loading && <p className="text-sm text-[var(--text-muted)]">Carregando itens…</p>}
          {error && <p className="text-sm text-[#e5484d]">{error}</p>}

          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">
              {products && products.length > 0
                ? "Nenhum item corresponde à busca."
                : "Nenhum item cadastrado ainda."}
            </p>
          )}

          {filtered.map((product) => (
            <div key={product.id} className="card flex flex-wrap items-center gap-4 p-4">
              {product.image ? (
                /* eslint-disable-next-line @next/next/no-img-element -- miniatura de URL livre do CMS */
                <img
                  src={product.image}
                  alt=""
                  className="h-14 w-10 shrink-0 rounded border border-[var(--border)] object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="h-14 w-10 shrink-0 rounded border border-[var(--border)]"
                  style={{ background: product.cover?.bg ?? "#0C0014" }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{product.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {typeLabel(product)} · estoque {product.stock}
                  {product.badge ? ` · ${product.badge}` : ""}
                  {product.digital ? " · digital" : ""}
                </p>
              </div>
              <span className="text-sm font-bold text-gold">{formatPrice(product.price)}</span>
              <div className="flex gap-2">
                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                  disabled={busyId === product.id}
                  onClick={() => void handleDelete(product)}
                >
                  {busyId === product.id ? "Excluindo…" : "Excluir"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
