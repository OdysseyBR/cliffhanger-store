"use client";

import { useEffect } from "react";

/**
 * Aplica o tema salvo (Default / Summer Fest) no <html> antes da hidratação
 * e mantém o atributo data-theme em sincronia com o estado global.
 */
export function ThemeSync() {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ch:theme");
      const theme = raw ? (JSON.parse(raw) as string) : "default";
      document.documentElement.dataset.theme = theme;
    } catch {
      /* sem storage — mantém tema padrão */
    }
  }, []);

  return null;
}
