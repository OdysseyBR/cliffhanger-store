import Link from "next/link";
import type { ReactNode } from "react";
import { menuButtons } from "@/lib/nav";
import {
  IconBag,
  IconBook,
  IconDice,
  IconDownload,
  IconGlobe,
  IconHeadphones,
  IconPen,
  IconRocket,
  IconShirt,
  IconTag,
  IconTablet,
} from "@/components/Icons";

const icons: Record<string, ReactNode> = {
  Loja: <IconBag />,
  Livros: <IconBook />,
  "E-books": <IconTablet />,
  Audiobooks: <IconHeadphones />,
  Produtos: <IconShirt />,
  Colecionáveis: <IconDice />,
  Universos: <IconGlobe />,
  Autores: <IconPen />,
  Lançamentos: <IconRocket />,
  Ofertas: <IconTag />,
  "Download do App": <IconDownload />,
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
              className="card group flex items-center gap-3 px-4 py-4 transition hover:-translate-y-1 hover:border-violet-soft"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-xl transition group-hover:bg-violet group-hover:text-[#F8FEFF]"
                aria-hidden
              >
                {icons[item.label] ?? "•"}
              </span>
              <span className="text-display font-menu min-w-0 flex-1 text-lg leading-none break-words">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
