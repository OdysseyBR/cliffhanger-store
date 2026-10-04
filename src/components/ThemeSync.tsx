"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/components/Providers";
import { themes } from "@/data/themes";

/**
 * Aplica o override de padrão visual do usuário (se houver) por cima do
 * padrão do servidor. "" (Padrão Cliffhanger — modo escuro) mantém o
 * padrão ativo e "claro" aplica o modo claro (alternados pelo botão do
 * header e pela página de Preferências). O valor vindo do servidor é
 * memorizado no primeiro efeito para que voltar a "" restaure o padrão
 * do servidor em vez do último override.
 *
 * A chave é validada contra os temas existentes: uma escolha antiga de um
 * tema removido (ex.: paletas de teste da Etapa K) volta ao padrão em vez
 * de deixar o html sem variáveis.
 */
export function ThemeSync() {
  const { theme, setTheme } = useStore();
  const serverTheme = useRef<string | null>(null);

  useEffect(() => {
    if (theme && !themes.some((t) => t.key === theme)) {
      setTheme("");
      return;
    }
    if (serverTheme.current === null) {
      serverTheme.current = document.documentElement.dataset.theme ?? "";
    }
    document.documentElement.dataset.theme = theme || serverTheme.current;
  }, [theme, setTheme]);

  return null;
}
