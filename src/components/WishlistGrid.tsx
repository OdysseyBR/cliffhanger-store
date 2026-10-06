"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

/** Grade da wishlist — usada em /wishlist e /conta/wishlist (§3/§11). */
export function WishlistGrid() {
  const { wishlist, user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  // catálogo: falha de rede/API é estado próprio (P0.2) — nunca passa por "vazio"
  useEffect(() => {
    let ativo = true;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { products: Product[] };
        if (ativo) setProducts(data.products ?? []);
      } catch {
        if (ativo) {
          setProducts([]);
          setErro(true);
        }
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const items = products.filter((p) => wishlist.includes(p.id));

  if (loading) {
    return (
      <div className="card grid place-items-center p-12 text-[var(--text-muted)]">Carregando…</div>
    );
  }

  if (erro) {
    return (
      <div className="card grid place-items-center gap-4 p-14 text-center">
        <p className="text-display text-4xl">Não foi possível carregar a wishlist</p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          Seus itens continuam salvos — só não conseguimos buscar preços e
          disponibilidade agora.
        </p>
        <button
          type="button"
          onClick={() => setTentativa((t) => t + 1)}
          className="btn btn-primary"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card grid place-items-center gap-4 p-14 text-center">
        <p className="text-display text-4xl">Sua wishlist está vazia</p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          Toque no coração de um produto para salvá-lo aqui e acompanhar preço e
          disponibilidade.
          {user ? "" : " Entre na conta para sincronizar."}
        </p>
        <Link href="/loja" className="btn btn-primary">
          Explorar a loja
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
