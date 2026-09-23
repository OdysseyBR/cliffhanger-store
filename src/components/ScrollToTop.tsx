"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Rola para o topo em cada navegação de rota. */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
