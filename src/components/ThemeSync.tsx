"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/components/Providers";

/**
 * Aplica o override de padrão visual do usuário (se houver) por cima do
 * padrão do servidor. "" (Padrão Cliffhanger) mantém o padrão ativo.
 * O valor vindo do servidor é memorizado no primeiro efeito para que
 * voltar a "" restaure o padrão do servidor em vez do último override.
 */
export function ThemeSync() {
  const theme = useStore().theme;
  const serverTheme = useRef<string | null>(null);

  useEffect(() => {
    if (serverTheme.current === null) {
      serverTheme.current = document.documentElement.dataset.theme ?? "";
    }
    document.documentElement.dataset.theme = theme || serverTheme.current;
  }, [theme]);

  return null;
}
