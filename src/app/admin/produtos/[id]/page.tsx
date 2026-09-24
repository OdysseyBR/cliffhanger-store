"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { useAdminProducts } from "@/components/admin/useAdminProducts";

/** Criador de itens — edição de um item existente (Doc Mestre 11.2). */
export default function EditarItemPage() {
  const { user } = useStore();
  const { id } = useParams<{ id: string }>();
  const { products, works, universes, authors, loading, error, reload } = useAdminProducts();

  if (!user) return <AdminLogin note="Entre com a conta administradora para editar itens." />;

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando item…</p>;
  }
  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#e5484d]">{error}</p>
        <button type="button" className="btn btn-ghost px-4 py-2 text-[11px]" onClick={reload}>
          Tentar de novo
        </button>
      </div>
    );
  }

  const product = products?.find((item) => item.id === id);
  if (!product) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Item não encontrado.</p>
        <Link href="/admin/produtos" className="btn btn-ghost px-4 py-2 text-[11px]">
          Voltar para itens
        </Link>
      </div>
    );
  }

  return <ProductEditor mode="edit" initial={product} refs={{ works, universes, authors }} />;
}
