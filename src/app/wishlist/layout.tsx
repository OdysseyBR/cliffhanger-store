import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Seus produtos favoritos salvos na Litterae.",
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
