import { SecuritySection } from "@/components/account/SecuritySection";

/** §8 — Segurança: senha, métodos, sessões e exclusão (Etapa 2 amplia). */
export default function ContaSegurancaPage() {
  return (
    <div className="card space-y-4 p-5">
      <div>
        <h1 className="text-display text-2xl text-gold">Segurança</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Senha, métodos de login, sessões e exclusão da conta.
        </p>
      </div>
      <SecuritySection />
    </div>
  );
}
