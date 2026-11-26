"use client";

import { useEffect } from "react";

/**
 * P1.1 — erro no ROOT layout: este componente substitui o layout inteiro e
 * NÃO recebe o globals.css nem o data-theme da loja (doc versionada:
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * error.md §Global Error). Por isso:
 * - o tema do navegador (ch:theme) é reaplicado por script inline antes da
 *   primeira pintura;
 * - a paleta da marca entra num <style> chapado, sem classes externas.
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
    <html lang="pt-BR" data-theme="claro" suppressHydrationWarning>
      <head>
        <title>Algo deu errado — Litterae</title>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=JSON.parse(localStorage.getItem("ch:theme")||\'""\');' +
              'if(t==="claro"||t==="default"){document.documentElement.dataset.theme=t;}}catch(e){}',
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body { margin: 0; min-height: 100%; }
body {
  background: #02000e;
  color: #f7f4f3;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  text-align: center;
}
html[data-theme="claro"] body { background: #f7f4f3; color: #02000e; }
.ops {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 4.5rem;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1;
  letter-spacing: .02em;
  margin: 0;
  color: #e5484d;
}
h1 {
  font-size: 1.75rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin: 14px 0 0;
  color: #f7f4f3;
}
html[data-theme="claro"] h1 { color: #02000e; }
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
button { background: #e67817; color: #02000e; }
button:hover { background: #f08a2e; }
a {
  background: transparent;
  color: #f7f4f3;
  border: 1px solid #f7f4f3;
}
html[data-theme="claro"] a { color: #02000e; border-color: #02000e; }
a:hover { background: #e67817; color: #02000e; border-color: #e67817; }
`,
          }}
        />
      </head>
      <body>
        <div>
          <p className="ops">Ops</p>
          <h1>Algo deu errado</h1>
          <p>
            Enfrentamos um obstáculo técnico. Tente novamente — se persistir,
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
