"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const { wishlist, user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/products");
        const data = (await res.json()) as { products: Product[] };
        setProducts(data.products ?? []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = products.filter((p) => wishlist.includes(p.id));

  return (
    <Page>
      <Section
        title="Wishlist"
        subtitle={
          user
            ? "Salva na sua conta Cliffhanger — sincronizada em qualquer dispositivo."
            : "Salva neste dispositivo. Entre na conta para sincronizar."
        }
        href="/loja"
        hrefLabel="Descobrir produtos"
      >
        {loading ? (
          <div className="card grid place-items-center p-12 text-[var(--text-muted)]">
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <p className="text-display text-4xl">Sua wishlist está vazia</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Toque no coração de um produto para salvá-lo aqui e acompanhar preço e
              disponibilidade.
            </p>
            <Link href="/loja" className="btn btn-primary">
              Explorar a loja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
