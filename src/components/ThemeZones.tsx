import Link from "next/link";
import type { ReactNode } from "react";
import { Countdown } from "@/components/Countdown";
import { IconArrowRight, IconSparkle } from "@/components/Icons";
import { HOME_SECTION_LABELS } from "@/lib/theme-css";
import type { ThemeZone, ThemeZonePlacement } from "@/lib/types";

/**
 * Zonas novas da Home (Documento Mestre 4.4 — extensão de festivais).
 * Winter Fest/Summer Fest etc. saem do padrão adicionando blocos que a
 * arquitetura oficial não tem. Cada zona declara onde entra (placement).
 */

function Marquee({ zone }: { zone: ThemeZone }) {
  const messages = (zone.messages ?? []).filter((m) => m.trim());
  if (messages.length === 0) return null;

  // duplica a lista para o loop contínuo da animação CSS
  const loop = [...messages, ...messages];

  return (
    <div className="zone-marquee" aria-label={zone.title ?? "Mensagens do festival"}>
      <div className="zone-marquee-track">
        {loop.map((message, index) => (
          <span key={`${index}-${message}`} className="zone-marquee-item">
            {message}
            <span aria-hidden className="zone-marquee-dot">
              <IconSparkle className="h-3 w-3" />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PromoGrid({ zone }: { zone: ThemeZone }) {
  const items = (zone.items ?? []).filter((item) => item.title.trim());
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {(zone.title || zone.subtitle) && (
        <div className="mb-6">
          {zone.title && <h2 className="text-display text-3xl sm:text-4xl">{zone.title}</h2>}
          {zone.subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{zone.subtitle}</p>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const body = (
            <>
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-glow" aria-hidden />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
              <div className="relative mt-auto p-5">
                <p className="text-display text-2xl text-paper">{item.title}</p>
                {item.subtitle && <p className="mt-1 text-xs text-paper/80">{item.subtitle}</p>}
              </div>
            </>
          );

          return item.href ? (
            <Link
              key={`${index}-${item.title}`}
              href={item.href}
              className="group relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-[var(--card-radius)] border border-[var(--border)] transition hover:-translate-y-1"
            >
              {body}
            </Link>
          ) : (
            <article
              key={`${index}-${item.title}`}
              className="group relative isolate flex min-h-44 flex-col justify-end overflow-hidden rounded-[var(--card-radius)] border border-[var(--border)]"
            >
              {body}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CategoryBand({ zone }: { zone: ThemeZone }) {
  const items = (zone.items ?? []).filter((item) => item.title.trim() && item.href);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {zone.title && (
        <h2 className="text-display mb-4 text-2xl sm:text-3xl">{zone.title}</h2>
      )}
      <div className="flex flex-wrap gap-3">
        {items.map((item, index) => (
          <Link
            key={`${index}-${item.title}`}
            href={item.href!}
            className="group flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 hover:border-gold"
          >
            <span className="text-display text-base">{item.title}</span>
            {item.subtitle && (
              <span className="text-xs font-normal text-[var(--text-muted)]">{item.subtitle}</span>
            )}
            <IconArrowRight className="h-4 w-4 text-gold transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function Editorial({ zone }: { zone: ThemeZone }) {
  if (!zone.title && !zone.body) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-glow" aria-hidden />
        <div
          className={`grid gap-6 p-6 sm:p-10 ${
            zone.image ? "lg:grid-cols-[1.2fr_0.8fr] lg:items-center" : ""
          }`}
        >
          <div>
            {zone.title && <h2 className="text-display text-3xl sm:text-4xl">{zone.title}</h2>}
            {zone.body && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
                {zone.body}
              </p>
            )}
            {zone.cta && (
              <Link href={zone.cta.href} className="btn btn-accent mt-5">
                {zone.cta.label}
              </Link>
            )}
          </div>
          {zone.image && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)]">
              <img
                src={zone.image}
                alt={zone.title ?? "Bloco editorial"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CountdownZone({ zone }: { zone: ThemeZone }) {
  if (!zone.countdown) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        {zone.title && <p className="text-display text-3xl sm:text-4xl">{zone.title}</p>}
        {zone.subtitle && (
          <p className="max-w-xl text-sm text-[var(--text-muted)]">{zone.subtitle}</p>
        )}
        <Countdown target={zone.countdown} />
        {zone.cta && (
          <Link href={zone.cta.href} className="btn btn-primary mt-2">
            {zone.cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}

const ZONE_RENDERERS: Record<ThemeZone["type"], (props: { zone: ThemeZone }) => ReactNode> = {
  marquee: Marquee,
  "promo-grid": PromoGrid,
  "category-band": CategoryBand,
  editorial: Editorial,
  countdown: CountdownZone,
};

/** Renderiza as zonas habilitadas de um ponto da Home. */
export function ThemeZones({
  zones,
  placement,
}: {
  zones: ThemeZone[];
  placement: ThemeZonePlacement;
}) {
  const matching = zones.filter((zone) => zone.enabled && zone.placement === placement);
  if (matching.length === 0) return null;

  return (
    <>
      {matching.map((zone) => {
        const render = ZONE_RENDERERS[zone.type];
        return <div key={zone.id}>{render ? render({ zone }) : null}</div>;
      })}
    </>
  );
}

/** Rótulos de zona para o admin (evita import circular em page.tsx). */
export const ZONE_PLACEMENT_HINTS = {
  "after-menu": " logo após os Menu Buttons",
  "after-destaques": " logo após os Destaques",
  end: " no fim da Home",
} as const;

/** Chaves de seção como texto para o editor. */
export const sectionLabel = (key: string) =>
  (HOME_SECTION_LABELS as Record<string, string>)[key] ?? key;
