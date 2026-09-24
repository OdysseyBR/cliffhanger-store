"use client";

import { useEffect } from "react";

/**
 * Rola até a âncora do hash da URL (ex.: /#colecoes).
 * Cobertura: carga direta com hash e navegação client-side entre páginas —
 * o handler de hash do App Router (16.3.6) não dispara sozinho nestes fluxos.
 */
export function HashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const raw = window.location.hash.slice(1);
      if (!raw) return;
      let id = raw;
      try {
        id = decodeURIComponent(raw);
      } catch {
        /* mantém o valor cru quando o hash não é um percent-encoding válido */
      }
      const el = document.getElementById(id);
      if (el) el.scrollIntoView();
    };

    scrollToHash();
    window.addEventListener("load", scrollToHash);
    window.addEventListener("hashchange", scrollToHash);
    window.addEventListener("popstate", scrollToHash);
    return () => {
      window.removeEventListener("load", scrollToHash);
      window.removeEventListener("hashchange", scrollToHash);
      window.removeEventListener("popstate", scrollToHash);
    };
  }, []);

  return null;
}
