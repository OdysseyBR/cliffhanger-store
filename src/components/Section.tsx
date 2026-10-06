import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowRight } from "@/components/Icons";

/** Seção da Home com título (display) e link opcional "ver tudo". */
export function Section({
  title,
  subtitle,
  href,
  hrefLabel = "Ver tudo",
  children,
  id,
  titleAs = "h2",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  id?: string;
  /** P1.8 — a primeira seção da rota pode carregar o `h1` da página. */
  titleAs?: "h1" | "h2";
}) {
  const Title = titleAs;
  return (
    <section id={id} className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Title className="text-display text-3xl sm:text-4xl">{title}</Title>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="text-sm font-bold uppercase tracking-wider text-gold transition hover:underline"
          >
            <span className="inline-flex items-center gap-1.5">
              {hrefLabel}
              <IconArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
