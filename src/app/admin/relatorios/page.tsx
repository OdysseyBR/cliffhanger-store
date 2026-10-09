import { RelatoriosView } from "./relatorios-view";

interface Props {
  searchParams: Promise<{ aba?: string }>;
}

/**
 * §36 — Relatórios. A rota (server) lê o deep-link `?aba=` das abas da
 * Etapa T (vendas|produtos|plus) e repassa para a visão cliente.
 */
export default async function AdminReportsPage({ searchParams }: Props) {
  const { aba } = await searchParams;
  return <RelatoriosView aba={aba ?? ""} />;
}
