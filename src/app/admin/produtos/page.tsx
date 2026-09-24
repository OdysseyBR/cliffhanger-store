"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { SelectInput, TextInput } from "@/components/admin/form-fields";
import { deleteProduct } from "@/components/admin/admin-api";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { formatPrice } from "@/lib/format";
import { PRODUCT_CATEGORY_OPTIONS, PRODUCT_TYPE_OPTIONS } from "@/lib/product-fields";
import type { Product } from "@/lib/types";

/**
 * Listagem de itens do catálogo (Doc Mestre 11.1 — módulo Produtos).
 * Leitura pública do catálogo; excluir/salvar exige super admin na API.
 */

function typeLabel(product: Product): string {
  return PRODUCT_TYPE_OPTIONS.find((option) => option.value === product.type)?.label ?? product.type;
}

function categoryLabel(product: Product): string {
  return (
    PRODUCT_CATEGORY_OPTIONS.find((option) => option.value === product.category)?.label ??
    product.category
  );
}

export default function AdminProdutosPage() {
  const { user, notify } = useStore();
  const { products, loading, error, reload } = useAdminProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        (!category || product.category === category) &&
        (!q || product.title.toLowerCase().includes(q) || product.slug.includes(q)),
    );
  }, [products, query, category]);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Itens da loja</p>
          <p className="text-xs text-[var(--text-muted)]">
            Criador de itens — literatura e produtos (Doc Mestre 11.2)
            {products ? ` · ${products.length} cadastrados` : ""}
          </p>
        </div>
        <Link href="/admin/produtos/novo" className="btn btn-primary px-4 py-2 text-[11px]">
          Novo item
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <TextInput value={query} onChange={setQuery} placeholder="Buscar por título ou slug…" />
        <SelectInput
          value={category}
          onChange={setCategory}
          options={[{ value: "", label: "Todas as categorias" }, ...PRODUCT_CATEGORY_OPTIONS]}
        />
      </div>

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
          <span
            aria-hidden
            className="h-14 w-10 shrink-0 rounded border border-[var(--border)]"
            style={{ background: product.cover?.bg ?? "#0C0014" }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{product.title}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {typeLabel(product)} · {categoryLabel(product)} · estoque {product.stock}
              {product.badge ? ` · ${product.badge}` : ""}
              {product.digital ? " · digital" : ""}
            </p>
          </div>
          <span className="text-sm font-bold text-gold">{formatPrice(product.price)}</span>
          <div className="flex gap-2">
            <Link href={`/admin/produtos/${product.id}`} className="btn btn-ghost px-3 py-2 text-[11px]">
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
    </div>
  );
}
