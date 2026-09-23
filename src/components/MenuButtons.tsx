import Link from "next/link";
import { menuButtons } from "@/lib/nav";

const icons: Record<string, string> = {
  Loja: "🛍️",
  Livros: "📚",
  "E-books": "📖",
  Audiobooks: "🎧",
  Produtos: "👕",
  Colecionáveis: "🎲",
  Universos: "🌌",
  Autores: "✍️",
  Lançamentos: "🚀",
  Ofertas: "🏷️",
};

/** Menu Buttons (Documento Mestre 3.4) — segundo bloco fixo da Home. */
export function MenuButtons() {
  return (
    <nav aria-label="Menu da loja" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {menuButtons.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="card group flex items-center gap-3 px-4 py-4 transition hover:-translate-y-1 hover:border-violet-soft hover:shadow-[0_16px_40px_-24px_rgba(86,3,173,1)]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-xl transition group-hover:bg-violet"
                aria-hidden
              >
                {icons[item.label] ?? "•"}
              </span>
              <span className="text-display text-lg leading-none">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
