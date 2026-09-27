import { getShopSettings } from "@/lib/shop-settings";

/**
 * §12/§17 — definições públicas da loja (subset seguro de `site/settings`):
 * limite do frete grátis, e-mail de suporte e aviso da home. Sem segredos,
 * sem guarda — os mesmos valores que a vitrine já exibe.
 */
export async function GET() {
  const settings = await getShopSettings();
  return Response.json({
    freeShippingFrom: settings.freeShippingFrom,
    supportEmail: settings.supportEmail,
    announcement:
      settings.announcementActive && settings.announcementText
        ? settings.announcementText
        : null,
  });
}
