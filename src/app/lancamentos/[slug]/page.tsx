import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { Countdown } from "@/components/Countdown";
import { IconArrowLeft, IconClock, IconGlobe, IconPen } from "@/components/Icons";
import { Page } from "@/components/Page";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { getCatalog, getLaunchBySlug, getLaunches } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const launches = await getLaunches();
  return launches.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const launch = await getLaunchBySlug(slug);
  if (!launch) return { title: "Lançamento não encontrado" };
  return {
    title: `${launch.title}${launch.highlight ? `: ${launch.highlight}` : ""}`,
    description: launch.synopsis.slice(0, 180),
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/** Trailer/teaser (13.1): aceita .mp4/.webm direto ou embed YouTube/Vimeo. */
function trailerSource(url: string): { kind: "video" | "iframe"; src: string } | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: "video", src: url };
  return null;
}

/** Página de lançamento (Documento Mestre 13.1). */
export default async function LancamentoPage({ params }: Props) {
  const { slug } = await params;
  const launch = await getLaunchBySlug(slug);
  if (!launch) notFound();

  const catalog = await getCatalog();
  const work = launch.workId
    ? catalog.works.find((w) => w.id === launch.workId)
    : undefined;
  const author = work ? catalog.authors.find((a) => a.id === work.authorId) : undefined;
  const universe = launch.universeId
    ? catalog.universes.find((u) => u.id === launch.universeId)
    : undefined;

  const editions = launch.productIds
    .map((id) => catalog.products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  // produtos derivados = merchandising do universo (livros/e-books/audiobooks
  // ficam nas "Edições" ou na página da obra)
  const derived = catalog.products.filter(
    (p) =>
      p.universeId === launch.universeId &&
      !launch.productIds.includes(p.id) &&
      p.category !== "livros" &&
      p.category !== "ebooks" &&
      p.category !== "audiobooks",
  );
  const trailer = launch.trailerUrl ? trailerSource(launch.trailerUrl) : null;
  const primaryEdition = editions[0];

  return (
    <Page>
      {/* Destaque do lançamento */}
      <section className="relative isolate overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 -z-10 opacity-25">
          <BookCover cover={launch.cover} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/85 to-[var(--surface)]" />

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/lancamentos"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] transition hover:text-gold"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Lançamentos
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="mx-auto aspect-[2/3] w-full max-w-[280px] overflow-hidden rounded-xl border border-[var(--border)] shadow-2xl">
              <BookCover
                cover={launch.cover}
                title={launch.title}
                label={launch.highlight ?? undefined}
              />
            </div>

            <div>
              <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
                {launch.preOrder ? (
                  <span className="rounded-full bg-gold px-3 py-1 text-ink">Pré-venda</span>
                ) : (
                  <span className="rounded-full bg-gold px-3 py-1 text-ink">Lançamento</span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1">
                  <IconClock className="h-3.5 w-3.5" />
                  {formatDate(launch.releaseDate)}
                </span>
              </div>

              <h1 className="text-display mt-4 text-5xl sm:text-6xl">{launch.title}</h1>
              {launch.highlight && (
                <p className="text-display text-2xl text-gold">{launch.highlight}</p>
              )}
              {author && (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  por{" "}
                  <Link
                    href={`/autores/${author.slug}`}
                    className="font-semibold text-gold hover:underline"
                  >
                    {author.name}
                  </Link>
                </p>
              )}

              <Countdown
                target={launch.releaseDate}
                prefix="Lança em"
                doneLabel="Lançamento disponível"
              />

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                {launch.synopsis}
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-xs">
                {primaryEdition && (
                  <Link href={`/produtos/${primaryEdition.slug}`} className="btn btn-accent">
                    {launch.preOrder ? "Reservar agora" : "Comprar agora"}
                  </Link>
                )}
                {work && (
                  <Link
                    href={`/obras/${work.slug}`}
                    className="btn btn-ghost inline-flex items-center gap-2 px-4 py-2"
                  >
                    <IconPen className="h-4 w-4" />
                    Ver a obra
                  </Link>
                )}
                {universe && (
                  <Link
                    href={`/universos/${universe.slug}`}
                    className="btn btn-ghost inline-flex items-center gap-2 px-4 py-2"
                  >
                    <IconGlobe className="h-4 w-4" />
                    {universe.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trailer / teaser */}
      {trailer && (
        <Section
          title="Trailer / teaser"
          subtitle="Um olhar rápido antes da data oficial."
        >
          <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
            {trailer.kind === "video" ? (
              <video
                src={trailer.src}
                controls
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <iframe
                src={trailer.src}
                title={`Trailer de ${launch.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            )}
          </div>
        </Section>
      )}

      {/* Edições */}
      {editions.length > 0 && (
        <Section
          title="Edições"
          subtitle="Formatos disponíveis deste lançamento."
          href={primaryEdition ? `/produtos/${primaryEdition.slug}` : undefined}
          hrefLabel="Ver detalhes"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {editions.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* Produtos derivados */}
      {derived.length > 0 && (
        <Section
          title="Produtos derivados"
          subtitle="Camisetas, cartazes e colecionáveis do mesmo universo."
          href={universe ? `/universos/${universe.slug}` : undefined}
          hrefLabel="Ver o universo"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {derived.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      )}

      {/* Redes sociais */}
      {launch.socials && launch.socials.length > 0 && (
        <Section
          title="Redes sociais"
          subtitle="Compartilhe este lançamento com quem precisa saber."
        >
          <div className="flex flex-wrap gap-3">
            {launch.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost inline-flex items-center gap-2 px-5 py-2.5"
              >
                {social.label}
              </a>
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
