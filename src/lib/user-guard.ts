import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";

/**
 * Guard de usuário comum (Documento de Correção §17 e §22) — usado pelas
 * rotas do cliente como `GET /api/orders/mine`. Verifica o ID token do
 * Firebase no servidor e devolve a identidade; NÃO checa super admin.
 */

export type UserGate = { uid: string; email: string } | Response;

export function isUserGateResponse(value: UserGate): value is Response {
  return value instanceof Response;
}

export async function requireUser(request: Request): Promise<UserGate> {
  const app = getAdminApp();
  if (!app) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer (.+)$/.exec(header)?.[1];
  if (!token) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    const uid = decoded.uid;
    const email = (decoded.email ?? "").trim().toLowerCase();
    if (!uid) throw new Error("uid ausente");
    return { uid, email };
  } catch {
    return Response.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
}
