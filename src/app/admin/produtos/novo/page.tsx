"use client";

import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { useAdminProducts } from "@/components/admin/useAdminProducts";

/** Criador de itens — modo novo (Doc Mestre 11.2). */
export default function NovoItemPage() {
  const { user } = useStore();
  const { works, universes, authors } = useAdminProducts();

  if (!user) return <AdminLogin note="Entre com a conta administradora para criar itens." />;

  return <ProductEditor mode="create" refs={{ works, universes, authors }} />;
}
