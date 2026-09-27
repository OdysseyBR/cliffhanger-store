import Link from "next/link";

/**
 * §14 — Minha Coleção ("eu tenho" ≠ wishlist "quero ter"). A coleção
 * completa — físicos e digitais comprados, organização por universo e
 * adição automática nas compras — chega na Etapa 3.
 */
export default function ContaColecaoPage() {
  return (
    <div className="card space-y-3 p-5">
      <p className="text-display text-2xl text-gold">Minha coleção</p>
      <p className="text-sm text-[var(--text-muted)]">
        Aqui vai morar tudo que você <strong>tem</strong>: livros físicos, e-books,
        audiobooks, colecionáveis e edições especiais — organizados por universo.
        A wishlist continua sendo o lugar do que você <strong>quer ter</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/conta/biblioteca" className="btn btn-ghost px-4 py-2 text-xs">
          Ver digitais
        </Link>
        <Link href="/conta/wishlist" className="btn btn-ghost px-4 py-2 text-xs">
          Ver wishlist
        </Link>
      </div>
    </div>
  );
}
