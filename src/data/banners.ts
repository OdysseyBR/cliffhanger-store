import type { Banner } from "@/lib/types";

/**
 * Banner padrão da loja — arte final única oficial (Documento de Correção §5).
 * Usado como fallback quando o painel não tem nenhum banner ativo, para a
 * Home sempre começar com o Banner (§3): Banner → Header → Menu Buttons.
 */
export const DEFAULT_BANNER: Banner = {
  id: "default-banner",
  name: "Pré-venda Valeharts III (padrão da loja)",
  image: "/banner-valeharts-iii.jpg",
  alt: "Valeharts III: A Trégua das Espadas — pré-venda aberta com envio em 05/12/2026",
  destinationType: "produto",
  destinationValue: "valeharts-iii-a-tregua-das-espadas-livro-fisico",
  order: 0,
  active: true,
  fullscreen: false,
  showHeader: true,
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
};

/** Catálogo local de banners (fallback sem Firestore). */
export const localBanners: Banner[] = [DEFAULT_BANNER];
