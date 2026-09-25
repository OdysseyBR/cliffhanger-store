import Link from "next/link";
import type { CSSProperties } from "react";
import { footerLinks, mainNav } from "@/lib/nav";

/**
 * Logo do footer como máscara CSS: o desenho é pintado com `currentColor`
 * (a cor do texto do rodapé = text-paper). Assim ela reage ao fundo de cada
 * padrão visual automaticamente — clara no Padrão Cliffhanger Claro, escura
 * no Padrão Cliffhanger — sem depender de uma lista de regras por tema.
 */
const logoMaskStyle: CSSProperties = {
  backgroundColor: "currentColor",
  WebkitMaskImage: "url(/logo-cliffhanger-branco.svg)",
  maskImage: "url(/logo-cliffhanger-branco.svg)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div>
          <span
            role="img"
            aria-label="Cliffhanger Store"
            className="block h-12 aspect-[1650/414]"
            style={logoMaskStyle}
          />
          <p className="mt-4 max-w-xs text-sm text-paper/70">
            Livros, e-books, audiobooks, produtos oficiais e colecionáveis dos universos
            Cliffhanger. Uma conta, toda a biblioteca.
          </p>
          <p className="mt-4 text-xs uppercase tracking-widest text-gold">
            #FiqueNaBrisa
          </p>
        </div>

        {footerLinks.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h3 className="text-display mb-3 text-xl text-gold">{group.title}</h3>
            <ul className="space-y-2 text-sm text-paper/80">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-gold">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-paper/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Cliffhanger Store — projeto de demonstração.</p>
          <ul className="flex flex-wrap gap-4">
            {mainNav.slice(-6).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
