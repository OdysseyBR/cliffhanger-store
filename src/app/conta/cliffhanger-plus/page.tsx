/**
 * §15 — central pessoal da assinatura (planos, situação, Drops e
 * gerenciamento). A contratação e o gerenciamento chegam na Etapa 4 —
 * aqui ficam os planos oficiais e o estado atual.
 */

const PLANS = [
  {
    name: "Essential",
    price: "R$24,99/mês",
    concept: "Economize.",
    perks: ["Frete grátis", "4 e-books temporários/mês", "Acesso antecipado", "Descontos exclusivos"],
  },
  {
    name: "Gold",
    price: "R$44,99/mês",
    concept: "Colecione.",
    perks: ["Tudo do Essential", "4 e-books permanentes/mês", "Clube do Leitor"],
  },
  {
    name: "Premium",
    price: "R$64,99/mês",
    concept: "Tenha acesso.",
    perks: [
      "Tudo do Gold",
      "Biblioteca completa enquanto assinar",
      "2 audiobooks permanentes/mês",
    ],
  },
];

export default function ContaPlusPage() {
  return (
    <div className="space-y-4">
      <div className="card space-y-2 p-5">
        <p className="text-display text-2xl text-gold">Cliffhanger+</p>
        <p className="text-sm text-[var(--text-muted)]">
          Situação atual: <strong>não assinado</strong>. Escolha um plano quando as
          assinaturas abrirem.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan.name} className="card space-y-2 p-5">
            <p className="text-display text-xl text-gold">
              Cliffhanger+ {plan.name}
            </p>
            <p className="text-sm font-bold">{plan.price}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {plan.concept}
            </p>
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              {plan.perks.map((perk) => (
                <li key={perk}>· {perk}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
