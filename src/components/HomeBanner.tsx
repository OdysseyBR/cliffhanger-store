import Link from "next/link";
import { bannerHref } from "@/lib/banner-fields";
import type { Banner } from "@/lib/types";

/**
 * Banner da Home — arte final única enviada por upload (Documento de
 * Correção §5). O site NÃO monta o banner: sem camadas de título, CTA,
 * fundo ou countdown — apenas a imagem completa, com destino ao clique,
 * texto alternativo, versão mobile (quando existir) e modo fullscreen.
 */
export function HomeBanner({ banner }: { banner: Banner }) {
  const href = bannerHref(banner);
  const alt = banner.alt?.trim() || banner.name;
  const external = /^https?:\/\//i.test(href);

  const anchorClass = banner.fullscreen
    ? "relative block h-[100svh] w-full overflow-hidden"
    : "relative block w-full";

  const art = (
    <picture className="block">
      {banner.imageMobile && <source media="(max-width: 640px)" srcSet={banner.imageMobile} />}
      {/* arte de proporção livre enviada pelo admin (§5): sem recorte e sem otimização que altere a composição */}
      <img
        src={banner.image}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        className={
          banner.fullscreen ? "h-full w-full object-cover" : "block h-auto w-full"
        }
      />
    </picture>
  );

  if (external) {
    return (
      <a href={href} className={anchorClass} target="_blank" rel="noopener noreferrer">
        {art}
      </a>
    );
  }

  return (
    <Link href={href} className={anchorClass}>
      {art}
    </Link>
  );
}
