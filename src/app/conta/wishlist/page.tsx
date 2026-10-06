import { WishlistGrid } from "@/components/WishlistGrid";

/** §3 — wishlist dentro do Centro da Conta (mesma grade de /wishlist). */
export default function ContaWishlistPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display text-2xl text-gold">Wishlist</h1>
        <p className="text-xs text-[var(--text-muted)]">Tudo que você quer ter.</p>
      </div>
      <WishlistGrid />
    </div>
  );
}
