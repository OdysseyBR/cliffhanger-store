import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

/**
 * Guard de super admin (Documento Mestre 11) — compartilhado por todas as
 * rotas /api/admin e de escrita do painel.
 *
 * Verifica o ID token do Firebase no servidor + exige e-mail verificado +
 * casa com o único SUPER_ADMIN_EMAIL (fail closed: sem variável, ou com
 * lista de e-mails, NINGUÉM entra).
 */

export type AdminGate = { email: string } | Response;

export function isGateResponse(value: AdminGate): value is Response {
  return value instanceof Response;
}

export async function requireAdmin(request: Request): Promise<AdminGate> {
  const app = getAdminApp();
  const db = getAdminDb();
  if (!app || !db) {
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

  let email: string | null = null;
  let verified = false;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    email = (decoded.email ?? "").trim().toLowerCase();
    verified = decoded.email_verified === true;
  } catch {
    return Response.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  // Exige e-mail verificado: bloqueia contas criadas com o e-mail do
  // super admin sem acesso à caixa de entrada (email/password aberto).
  if (!email || !verified) {
    return Response.json(
      { error: "E-mail da conta não verificado." },
      { status: 403 },
    );
  }

  // Super admin único: o valor da variável DEVE ser um único e-mail e
  // ser igual ao da sessão. Lista com vírgula/espço nunca casa com um
  // e-mail real → nega todo mundo (fail closed).
  const superAdmin = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!superAdmin || email !== superAdmin) {
    return Response.json(
      { error: "Conta sem permissão de administrador." },
      { status: 403 },
    );
  }

  return { email };
}
