export default function Loading() {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-3xl place-items-center px-4">
      <div className="text-center">
        <p className="text-display animate-pulse text-4xl text-gold">Carregando…</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Preparando a próxima história para você.
        </p>
      </div>
    </div>
  );
}
