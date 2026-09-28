"use client";

import Link from "next/link";

/**
 * §24–§26 — abas do módulo Cliffhanger+ no painel: Planos, Drops e
 * Clube do Leitor (seções separadas do §16).
 */

export type PlusTab = "planos" | "drops" | "clube";

const PLUS_TABS: Array<{ key: PlusTab; href: string; label: string }> = [
  { key: "planos", href: "/admin/cliffhanger-plus", label: "Planos" },
  { key: "drops", href: "/admin/cliffhanger-plus/drops", label: "Drops" },
  { key: "clube", href: "/admin/cliffhanger-plus/clube", label: "Clube do Leitor" },
];

export function PlusTabs({ active }: { active: PlusTab }) {
  return (
    <nav aria-label="Seções do Cliffhanger+" className="flex flex-wrap gap-1.5">
      {PLUS_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
            tab.key === active
              ? "bg-gold text-ink"
              : "border border-[var(--border)] text-[var(--text-muted)] hover:border-gold hover:text-gold"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
