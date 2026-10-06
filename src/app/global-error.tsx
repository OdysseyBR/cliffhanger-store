"use client";

import { useEffect } from "react";

/**
 * P1.1 — erro no ROOT layout: este componente substitui o layout inteiro e
 * NÃO recebe o globals.css nem o data-theme da loja (doc versionada:
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * error.md §Global Error). Por isso:
 * - o tema do navegador (ch:theme) é reaplicado por script inline antes da
 *   primeira pintura;
 * - a paleta P4 entra num <style> chapado, sem classes externas.
 *
 * Props: `retry` (Next 16) — diferente do `reset` do error.tsx de segmento.
 * Sem metadata export (client component): o <title> é o componente React.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR" data-theme="default" suppressHydrationWarning>
      <head>
        <title>Algo deu errado — Cliffhanger Store</title>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=JSON.parse(localStorage.getItem("ch:theme")||\'""\');' +
              'if(t==="claro"){document.documentElement.dataset.theme="claro";}}catch(e){}',
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body { margin: 0; min-height: 100%; }
body {
  background: #0E0000;
  color: #F8FEFF;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  text-align: center;
}
html[data-theme="claro"] body { background: #F8FEFF; color: #0E0000; }
.ops {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 4.5rem;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1;
  letter-spacing: .02em;
  margin: 0;
  color: #E7CB9B;
}
html[data-theme="claro"] .ops { color: #A30707; }
h1 {
  font-size: 1.75rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin: 14px 0 0;
  color: #F8FEFF;
}
html[data-theme="claro"] h1 { color: #0E0000; }
p { max-width: 28rem; margin: 16px auto 0; line-height: 1.6; }
.acoes { display: flex; gap: 12px; justify-content: center; margin-top: 28px; flex-wrap: wrap; }
button, a {
  font: inherit;
  font-weight: 700;
  border: 0;
  border-radius: .75rem;
  padding: 14px 24px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
button { background: #A30707; color: #F8FEFF; }
button:hover { background: #E7CB9B; color: #0E0000; }
a {
  background: transparent;
  color: #F8FEFF;
  border: 1px solid #F8FEFF;
}
html[data-theme="claro"] a { color: #0E0000; border-color: #0E0000; }
a:hover { background: #E7CB9B; color: #0E0000; border-color: #E7CB9B; }
`,
          }}
        />
      </head>
      <body>
        <div>
          <p className="ops">Ops</p>
          <h1>Algo deu errado</h1>
          <p>
            Enfrentamos um cliffhanger técnico. Tente novamente — se persistir,
            volte para a home.
          </p>
          <div className="acoes">
            <button type="button" onClick={() => retry()}>
              Tentar novamente
            </button>
            {/* Recarga dura é intencional: no erro raiz a navegação soft pode
                repetir o mesmo crash. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Voltar ao início</a>
          </div>
        </div>
      </body>
    </html>
  );
}
