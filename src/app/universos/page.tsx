import type { Metadata } from "next";
import { UniverseCard } from "@/components/Cards";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getUniverses } from "@/lib/data";

export const metadata: Metadata = {
  title: "Universos",
  description: "Explore os universos da Cliffhanger: Valeharts, Neon Sertão e Biblioteca dos Afogados.",
};

export default async function UniversosPage() {
  const universes = await getUniverses();

  return (
    <Page>
      <Section
        title="Universos"
        subtitle="Todo produto da loja nasce dentro de um universo. Escolha por onde começar."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universes.map((universe) => (
            <UniverseCard key={universe.id} universe={universe} />
          ))}
        </div>
      </Section>
    </Page>
  );
}
