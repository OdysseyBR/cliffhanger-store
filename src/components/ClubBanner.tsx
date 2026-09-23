import Image from "next/image";
import Link from "next/link";

/** Assinatura da casa — presença do Cliffhanger Club na Home (seção 3.6). */
export function ClubBanner() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card relative isolate overflow-hidden p-6 sm:p-10">
        <div className="absolute inset-0 -z-10 bg-glow opacity-70" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gold">
              Cliffhanger Club
            </span>
            <h2 className="text-display mt-2 text-4xl sm:text-5xl">
              Leia, acumule pontos, desbloqueie
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
              O clube de leitura da loja: pontos a cada compra, edições exclusivas para membros e
              acesso antecipado a pré-vendas. Comece agora — é grátis.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/conta" className="btn btn-primary">
                Criar conta gratuita
              </Link>
              <Link href="/biblioteca" className="btn btn-ghost">
                Ir para a biblioteca
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)]">
            <Image
              src="/summer-fest.png"
              alt="Cliffhanger Club"
              fill
              sizes="(max-width: 1024px) 100vw, 32rem"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
