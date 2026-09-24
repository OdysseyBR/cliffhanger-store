import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * POST /api/account/revoke — "Sair de todos os dispositivos" (Doc Mestre 9.5).
 *
 * O client SDK do Firebase não expõe revogação de sessões; aqui o Admin SDK
 * revoga os refresh tokens do UID decodificado do ID token enviado no header
 * `Authorization: Bearer <idToken>`. Sem Admin configurado, responde 503
 * (ambiente local sem credenciais).
 */
export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!idToken) {
    return Response.json({ error: "Token de sessão ausente." }, { status: 401 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return Response.json(
      { error: "Encerramento remoto de sessões não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    // checkRevoked=false de propósito: o token do próprio usuário que está
    // pedindo a revogação ainda é válido e precisa passar na verificação.
    const decoded = await auth.verifyIdToken(idToken);
    await auth.revokeRefreshTokens(decoded.uid);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }
}
