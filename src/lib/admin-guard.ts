import { getAuth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import {
  can,
  isAdminRole,
  permissionsFor,
  type AdminPermission,
  type AdminRole,
} from "@/lib/roles";

/**
 * Guard administrativo (Documento Mestre 11 + Documento de Correção §13)
 * — compartilhado por todas as rotas /api/admin e de escrita do painel.
 *
 * Verifica o ID token do Firebase no servidor + exige e-mail verificado.
 *
 * Papéis (§13): o SUPER_ADMIN_EMAIL é implicitamente "administrador"
 * (todas as permissões); demais contas precisam de registro ATIVO em
 * `adminUsers`.
 *
 * Dois níveis:
 * - `requireAdminSession` → só autentica e resolve o papel (usado por
 *   `/api/admin/me`, onde cada papel precisa saber o próprio papel);
 * - `requireAdmin(request, permission?)` → autentica e aplica a matriz:
 *   com permissão, exige `can(papel, permissão)`; sem, exige "administrador".
 *
 * Fail closed em todas as etapas: sem variável SUPER_ADMIN_EMAIL, com
 * lista de e-mails, sem Firestore ou sem papel registrado — ninguém entra.
 */

export interface AdminContext {
  email: string;
  uid: string;
  role: AdminRole;
  permissions: AdminPermission[];
}

export type AdminGate = AdminContext | Response;

export function isGateResponse(value: AdminGate): value is Response {
  return value instanceof Response;
}

function denied(message: string, status: 401 | 403 | 503): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Resolve o papel da conta: super admin → administrador; demais, pela
 * coleção `adminUsers` (documento ativo cujo e-mail case com a sessão).
 * Retorna `null` quando a conta não tem acesso ao painel.
 */
async function resolveRole(db: Firestore, email: string): Promise<AdminRole | null> {
  const superAdmin = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (superAdmin && email === superAdmin) return "administrador";

  try {
    const snap = await db.collection("adminUsers").where("email", "==", email).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const data = doc.data() as { role?: unknown; active?: unknown };
    if (data.active === false) return null;
    return isAdminRole(data.role) ? data.role : null;
  } catch {
    return null;
  }
}

export async function requireAdminSession(request: Request): Promise<AdminGate> {
  const app = getAdminApp();
  const db = getAdminDb();
  if (!app || !db) {
    return denied("Firestore não configurado neste ambiente.", 503);
  }

  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer (.+)$/.exec(header)?.[1];
  if (!token) return denied("Autenticação necessária.", 401);

  let email: string | null = null;
  let uid = "";
  let verified = false;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    email = (decoded.email ?? "").trim().toLowerCase();
    uid = decoded.uid ?? "";
    verified = decoded.email_verified === true;
  } catch {
    return denied("Sessão inválida ou expirada.", 401);
  }

  // Exige e-mail verificado: bloqueia contas criadas com o e-mail do
  // super admin sem acesso à caixa de entrada (email/password aberto).
  if (!email || !verified) return denied("E-mail da conta não verificado.", 403);

  const role = await resolveRole(db, email);
  if (!role) return denied("Conta sem permissão de administrador.", 403);

  return { email, uid, role, permissions: permissionsFor(role) };
}

/**
 * Guard com matriz de permissões (§13). Sem `permission`, a operação é
 * restrita ao papel "administrador"; com `permission`, vale a matriz de
 * `src/lib/roles.ts`.
 */
export async function requireAdmin(
  request: Request,
  permission?: AdminPermission,
): Promise<AdminGate> {
  const session = await requireAdminSession(request);
  if (isGateResponse(session)) return session;

  if (permission) {
    if (!can(session.role, permission)) {
      return denied(`Papel ${session.role} sem permissão para ${permission}.`, 403);
    }
  } else if (session.role !== "administrador") {
    return denied(`Papel ${session.role} sem acesso a esta operação.`, 403);
  }

  return session;
}
