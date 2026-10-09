import { ProdutosView } from "./produtos-view";

interface Props {
  searchParams: Promise<{ tipo?: string }>;
}

/**
 * Listagem de itens do catálogo (Doc Mestre 11.1 — módulo Produtos).
 * A rota (server) lê o deep-link `?tipo=` das abas da Etapa T e repassa
 * para a visão cliente — sem `useSearchParams`/efeitos no cliente.
 */
export default async function AdminProdutosPage({ searchParams }: Props) {
  const { tipo } = await searchParams;
  return <ProdutosView tipo={tipo ?? ""} />;
}
