"use client";

import { useStore } from "@/components/Providers";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { WishlistGrid } from "@/components/WishlistGrid";

export default function WishlistPage() {
  const { user } = useStore();

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
        <WishlistGrid />
      </Section>
    </Page>
  );
}
