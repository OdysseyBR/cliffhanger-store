import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS da API pública (/api/*) — Next 16: o arquivo-convenção `middleware`
 * virou `proxy` (docs: next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 *
 * Motivo: o app mobile publica um build web (Expo) e qualquer cliente de
 * terceiros chama a API; sem estes headers o navegador bloqueia a leitura
 * (erro "No 'Access-Control-Allow-Origin' header"). A API não usa cookie
 * como credencial (auth é Bearer/Firebase no cliente), então refletir a
 * origem é seguro: não há sessão de cookie para expor, e as rotas de
 * escrita continuam exigindo o ID token do próprio usuário.
 *
 * `/api/admin/*` fica de fora: o painel é same-origin e não precisa de CORS.
 */
const CORS_OPTIONS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function proxy(request: NextRequest) {
  // Painel administrativo: mesmo domínio, sem CORS.
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");

  // Preflight (OPTIONS) é respondido aqui — as rotas não tratam OPTIONS.
  if (request.method === "OPTIONS") {
    const headers: Record<string, string> = {
      ...CORS_OPTIONS,
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    };
    return new NextResponse(null, { status: 204, headers });
  }

  // Requisição simples/efetivada: repassa para a rota com os headers.
  const response = NextResponse.next();
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  for (const [key, value] of Object.entries(CORS_OPTIONS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
