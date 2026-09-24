import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import type { ThemeBanner as BannerConfig } from "@/lib/types";

/**
 * Banner da Home (Documento Mestre 3.1) — primeiro elemento visual.
 * Conteúdo dirigido pelo CMS do Theme Engine (modelo ativo): promoção,
 * lançamento, festival, pré-venda ou campanha, com CTA, countdown e stats.
 */
export function ThemeBanner({ banner }: { banner: BannerConfig }) {
  const hasImage = Boolean(banner.image);
  const hasVideo = Boolean(banner.video);
  // Doc Mestre 3.1 — o banner pode suportar imagem OU vídeo no quadro lateral.
  const hasMedia = hasImage || hasVideo;

  return (
    <section className="relative isolate overflow-hidden bg-glow">
      <div
        className={`mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:items-center lg:px-8 lg:py-20 ${
          hasMedia ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1"
        }`}
      >
        <div className={`relative z-10 ${hasMedia ? "" : "max-w-3xl"}`}>
          {banner.eyebrow && (
            <span className="inline-block rounded-full border border-gold/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">
              {banner.eyebrow}
            </span>
          )}

          <h1 className="text-display mt-5 text-5xl leading-[0.9] sm:text-6xl lg:text-7xl">
            {banner.title}
            {banner.highlight && <span className="text-gradient block">{banner.highlight}</span>}
          </h1>

          {banner.description && (
            <p className="mt-5 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
              {banner.description}
            </p>
          )}

          {(banner.primaryCta || banner.secondaryCta) && (
            <div className="mt-7 flex flex-wrap gap-3">
              {banner.primaryCta && (
                <Link href={banner.primaryCta.href} className="btn btn-accent">
                  {banner.primaryCta.label}
                </Link>
              )}
              {banner.secondaryCta && (
                <Link href={banner.secondaryCta.href} className="btn btn-ghost">
                  {banner.secondaryCta.label}
                </Link>
              )}
            </div>
          )}

          {banner.countdown && <Countdown target={banner.countdown} />}

          {banner.stats && banner.stats.length > 0 && (
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 text-sm">
              {banner.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[var(--text-muted)]">{stat.label}</dt>
                  <dd className="text-display text-2xl text-gold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {hasMedia && (
          <div className="relative">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(86,3,173,0.9)]">
              {hasVideo && banner.video ? (
                <video
                  src={banner.video}
                  poster={banner.image}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                banner.image && (
                  <Image
                    src={banner.image}
                    alt={banner.imageCaption ?? banner.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 44rem"
                    className="object-cover"
                  />
                )
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              {(banner.imageCaption || banner.imageCta) && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                  <span className="text-display text-xl text-paper">
                    {banner.imageCaption ?? banner.title}
                  </span>
                  {banner.imageCta && (
                    <Link href={banner.imageCta.href} className="btn btn-accent px-4 py-2 text-[11px]">
                      {banner.imageCta.label}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
