import type { ReactNode } from "react";
import { HashScroll } from "@/components/HashScroll";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Casca padrão de página: permite que a Home coloque o BANNER antes do
 * HEADER (arquitetura fixa: BANNER → HEADER → MENU BUTTONS → DESTAQUES),
 * enquanto as páginas internas mantêm o header no topo.
 */
export function Page({
  children,
  beforeHeader,
  hideHeader = false,
}: {
  children: ReactNode;
  beforeHeader?: ReactNode;
  /** Modo Somente Banner (Documento Mestre 3.3): oculta o header na Home. */
  hideHeader?: boolean;
}) {
  return (
    <>
      <HashScroll />
      {beforeHeader}
      {!hideHeader && <SiteHeader />}
      {children}
    </>
  );
}
