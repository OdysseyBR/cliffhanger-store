import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getAuthors } from "@/lib/data";

export const metadata: Metadata = {
  title: "Autores",
  description: "Conheça os autores dos universos Cliffhanger.",
};

export default async function AutoresPage() {
  const authors = await getAuthors();

  return (
    <Page>
      <Section title="Autores" subtitle="Quem escreve, desenha e cria os universos da casa.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <Link
              key={author.id}
              href={`/autores/${author.slug}`}
              className="card group p-6 transition hover:-translate-y-1 hover:border-violet-soft"
            >
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-violet text-xl font-extrabold text-white">
                {author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <p className="text-display text-3xl group-hover:text-gold">{author.name}</p>
              <p className="text-xs uppercase tracking-wider text-gold">{author.role}</p>
              <p className="mt-3 line-clamp-3 text-sm text-[var(--text-muted)]">{author.bio}</p>
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  );
}
