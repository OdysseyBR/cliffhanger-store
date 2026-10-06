import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";
import { getShopSettings } from "@/lib/shop-settings";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Cliffhanger Store: suporte a pedidos, trocas, digitais, clube e parcerias.",
};

/** Reflete o e-mail de suporte (Configurações §12) em até 5 minutos. */
export const revalidate = 300;

const STATIC_CHANNELS: { title: string; lines: string[] }[] = [
  {
    title: "Contas e digitais",
    lines: [
      "conta@cliffhangerstore.xyz",
      "Login, biblioteca, e-books e audiobooks",
      "Segunda a sexta, das 9h às 18h",
    ],
  },
  {
    title: "Imprensa e parcerias",
    lines: [
      "parcerias@cliffhangerstore.xyz",
      "Solicitações de imprensa, reviews e collabs",
      "Resposta em até 3 dias úteis",
    ],
  },
];

/** Rota obrigatória §22 — canais de atendimento. */
export default async function ContatoPage() {
  const settings = await getShopSettings();
  const channels = [
    {
      title: "Suporte a pedidos",
      lines: [
        settings.supportEmail,
        "Segunda a sexta, das 9h às 18h",
        "Resposta em até 1 dia útil",
      ],
    },
    ...STATIC_CHANNELS,
  ];
  return (
    <Page>
      <Section
        title="Contato"
        titleAs="h1"
        subtitle="Escolha o canal certo — quanto mais específico, mais rápido respondemos."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {channels.map((channel) => (
            <div key={channel.title} className="card space-y-2 p-6">
              <h2 className="text-display text-xl text-gold">{channel.title}</h2>
              {channel.lines.map((line, index) => {
                const email = index === 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line);
                return (
                  <p
                    key={line}
                    className={index === 0 ? "text-sm font-semibold" : "text-sm text-[var(--text-muted)]"}
                  >
                    {email ? (
                      <a href={`mailto:${line}`} className="transition hover:text-gold">
                        {line}
                      </a>
                    ) : (
                      line
                    )}
                  </p>
                );
              })}
            </div>
          ))}
        </div>

        <div className="card mt-6 grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <h2 className="text-display text-2xl">Antes de falar conosco</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Muitas dúvidas já estão respondidas em perguntas frequentes e no
              acompanhamento de pedidos.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/faq" className="btn btn-ghost px-5">
                Ver perguntas frequentes
              </Link>
              <Link href="/pedidos" className="btn btn-ghost px-5">
                Meus pedidos
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
            <p className="font-bold text-gold">Cliffhanger Club</p>
            <p className="mt-1">
              Membros do clube têm fila preferencial no suporte — acesse sua conta
              para informar o número do pedido ou o e-mail da compra.
            </p>
            <p className="mt-3 text-xs">
              Fale com a gente pelo canal que preferir — resposta rápida em dias úteis.
            </p>
          </div>
        </div>
      </Section>
    </Page>
  );
}
