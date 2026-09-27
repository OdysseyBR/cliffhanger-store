/**
 * Seções de configuração cujo conteúdo chega na Etapa 2. Cada página já
 * existe na rota oficial (§4) com o escopo descrito.
 */
export function ConfigComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-2 p-5">
      <p className="text-display text-2xl text-gold">{title}</p>
      <p className="text-sm text-[var(--text-muted)]">{children}</p>
    </div>
  );
}
