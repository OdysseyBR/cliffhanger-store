import { ConfigComingSoon } from "@/app/conta/configuracoes/coming-soon";

/** §7 — métodos salvos (só referências seguras) e preferido (Etapa 2). */
export default function ContaPagamentosPage() {
  return (
    <ConfigComingSoon title="Pagamentos">
      Bandeira, últimos dígitos e validade dos métodos salvos — a loja nunca guarda o
      número completo do cartão.
    </ConfigComingSoon>
  );
}
