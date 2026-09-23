import Link from "next/link";
import { footerLinks, mainNav } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <img
            src="/logo-cliffhanger-branco.svg"
            alt="Cliffhanger Store"
            className="h-12 w-auto"
            width={220}
            height={48}
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
