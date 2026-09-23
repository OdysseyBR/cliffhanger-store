import Image from "next/image";
import Link from "next/link";

/**
 * Banner da Home (Documento Mestre 3.1) — primeiro elemento visual.
 * Campanha de lançamento de Valeharts III (pré-venda) com CTA.
 */
export function Banner() {
  return (
    <section className="relative isolate overflow-hidden bg-glow">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-20">
        <div className="relative z-10">
          <span className="inline-block rounded-full border border-gold/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">
            Pré-venda aberta · envio em 05/12/2026
          </span>

          <h1 className="text-display mt-5 text-5xl leading-[0.9] sm:text-6xl lg:text-7xl">
            Valeharts III
            <span className="text-gradient block">A Trégua das Espadas</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
            O volume que fecha a primeira trilogia chegou à loja em pré-venda. Reserve agora e
            garanta exemplar numerado, capa dura e envio prioritário.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/produtos/valeharts-iii-a-tregua-das-espadas-livro-fisico" className="btn btn-accent">
              Reservar agora
            </Link>
            <Link href="/livros" className="btn btn-ghost">
              Ver todos os livros
            </Link>
          </div>

          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-[var(--text-muted)]">Universo</dt>
              <dd className="text-display text-2xl text-gold">Valeharts</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Formatos</dt>
              <dd className="text-display text-2xl text-gold">3</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Avaliação</dt>
              <dd className="text-display text-2xl text-gold">5,0</dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(86,3,173,0.9)]">
            <Image
              src="/winter-fest.png"
              alt="Campanha de inverno Cliffhanger Store"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 44rem"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
              <span className="text-display text-xl text-paper">Cliffhanger Winter Fest</span>
              <Link href="/ofertas" className="btn btn-accent px-4 py-2 text-[11px]">
                Ofertas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
