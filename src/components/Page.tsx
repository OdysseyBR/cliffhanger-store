import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Casca padrão de página: permite que a Home coloque o BANNER antes do
 * HEADER (arquitetura fixa: BANNER → HEADER → MENU BUTTONS → DESTAQUES),
 * enquanto as páginas internas mantêm o header no topo.
 */
export function Page({
  children,
  beforeHeader,
}: {
  children: ReactNode;
  beforeHeader?: ReactNode;
}) {
  return (
    <>
      {beforeHeader}
      <SiteHeader />
      {children}
    </>
  );
}
