import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <p className="text-display text-7xl text-gold">404</p>
        <h1 className="text-display mt-3 text-4xl">Página não encontrada</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-[var(--text-muted)]">
          O capítulo que você procurou não existe — ou nunca foi publicado. Que tal voltar para a
          loja e escolher outra história?
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Início
          </Link>
          <Link href="/loja" className="btn btn-ghost">
            Ir para a loja
          </Link>
          <Link href="/buscar" className="btn btn-ghost">
            Buscar
          </Link>
        </div>
      </div>
    </div>
  );
}
