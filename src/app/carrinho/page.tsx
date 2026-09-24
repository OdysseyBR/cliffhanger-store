"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { ProductArt } from "@/components/ProductArt";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

const FREE_SHIPPING_FROM = 199;

export default function CarrinhoPage() {
  const { cart, setQty, removeFromCart, clearCart } = useStore();
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

  const lines = cart
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((line): line is { item: typeof cart[number]; product: Product } =>
      Boolean(line.product),
    );

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.item.qty, 0);
  const hasPhysical = lines.some((l) => !l.product.digital);
  const missingForFreeShipping = hasPhysical
    ? Math.max(0, FREE_SHIPPING_FROM - subtotal)
    : 0;
  const progress = hasPhysical
    ? Math.min(100, Math.round((subtotal / FREE_SHIPPING_FROM) * 100))
    : 100;

  // Recomendações relacionadas (Doc Mestre 7.1): mesma obra → mesmo universo →
  // melhor avaliado, sempre fora do carrinho.
  const cartIds = new Set(cart.map((item) => item.productId));
  const cartWorkIds = new Set(lines.map((l) => l.product.workId));
  const cartUniverseIds = new Set(lines.map((l) => l.product.universeId));
  const notInCart = products.filter((p) => !cartIds.has(p.id));
  const relatedPool = [
    ...notInCart.filter((p) => p.workId !== undefined && cartWorkIds.has(p.workId)),
    ...notInCart.filter(
      (p) =>
        !(p.workId !== undefined && cartWorkIds.has(p.workId)) &&
        p.universeId !== undefined &&
        cartUniverseIds.has(p.universeId),
    ),
    ...[...notInCart].sort((a, b) => b.rating - a.rating),
  ];
  const recs = relatedPool
    .filter((p, index, arr) => arr.findIndex((other) => other.id === p.id) === index)
    .slice(0, 4);

  return (
    <Page>
      <Section
        title="Carrinho"
        subtitle="Itens digitais e físicos convivem no mesmo pedido — o frete só é cobrado no que precisa de envio."
        href="/loja"
        hrefLabel="Continuar comprando"
      >
        {loading ? (
          <div className="card grid place-items-center p-12 text-[var(--text-muted)]">
            Carregando carrinho…
          </div>
        ) : lines.length === 0 ? (
          <div className="card grid place-items-center gap-4 p-14 text-center">
            <p className="text-display text-4xl">Seu carrinho está vazio</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              Explore os universos, escolha seu formato preferido e comece uma nova história.
            </p>
            <Link href="/loja" className="btn btn-primary">
              Ver a loja
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <ul className="space-y-4">
              {lines.map(({ item, product }) => (
                <li key={product.id} className="card flex gap-4 p-4">
                  <Link
                    href={`/produtos/${product.slug}`}
                    className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]"
                  >
                    <ProductArt product={product} />
                  </Link>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/produtos/${product.slug}`}
                          className="text-sm font-bold hover:text-gold"
                        >
                          {product.title}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {product.digital ? "Entrega digital · Biblioteca" : "Envio físico"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="text-xs text-[var(--text-muted)] transition hover:text-[#e5484d]"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-[var(--border)]">
                        <button
                          type="button"
                          className="px-3 py-1"
                          onClick={() => setQty(product.id, item.qty - 1)}
                          aria-label="Diminuir"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <button
                          type="button"
                          className="px-3 py-1"
                          onClick={() => setQty(product.id, item.qty + 1)}
                          aria-label="Aumentar"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-display text-xl text-gold">
                        {formatPrice(product.price * item.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}

              <li>
                <button type="button" onClick={clearCart} className="text-xs text-[var(--text-muted)] hover:text-[#e5484d]">
                  Esvaziar carrinho
                </button>
              </li>
            </ul>

            {/* recomendações relacionadas (7.1) */}
            {recs.length > 0 && (
              <div className="card p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">
                  Recomendações relacionadas
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {recs.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* resumo */}
            <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-32">
              <h2 className="text-display text-2xl">Resumo</h2>

              {hasPhysical && (
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Frete grátis acima de {formatPrice(FREE_SHIPPING_FROM)}</span>
                    <span className="font-bold text-gold">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-raised-2)]">
                    <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {missingForFreeShipping > 0 && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Faltam <strong className="text-gold">{formatPrice(missingForFreeShipping)}</strong> para frete grátis.
                    </p>
                  )}
                </div>
              )}

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Frete</dt>
                  <dd>{hasPhysical ? "calculado no checkout" : "—"}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="text-gold">{formatPrice(subtotal)}</dd>
                </div>
              </dl>

              <Link href="/checkout" className="btn btn-accent w-full">
                Ir para o checkout
              </Link>
              <Link href="/loja" className="btn btn-ghost w-full">
                Continuar comprando
              </Link>
            </aside>
          </div>
        )}
      </Section>
    </Page>
  );
}
