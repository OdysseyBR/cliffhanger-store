"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/components/Providers";

/**
 * Aplica o override de tema do usuário (se houver) por cima do modelo
 * publicado definido no servidor. "" (Automático) mantém o modelo ativo.
 * O valor vindo do servidor é memorizado no primeiro efeito para que
 * voltar a "Automático" restaure o modelo ativo em vez do último override.
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
