import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminAuth, getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { ADMIN_ROLE_LABELS, isAdminRole, type AdminRole } from "@/lib/roles";
import type { AdminUser } from "@/lib/types";

/**
 * §13 — Equipe e permissões do painel.
 * Coleção `adminUsers` (id = e-mail normalizado). Apenas quem tem
 * `admins.edit` (super admin / papel Administrador) lê e escreve.
 *
 * O super admin único (SUPER_ADMIN_EMAIL) aparece como "implícito":
 * não pode ter o acesso revogado por aqui.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function superAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "admins.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ admins: [], superAdmin: superAdminEmail() });

  try {
    const snap = await db.collection("adminUsers").orderBy("email").get();
    const admins = snap.docs.map((doc) => {
      const data = doc.data() as Omit<AdminUser, "email">;
      return { email: doc.id, ...data } satisfies AdminUser;
    });
    return Response.json({ admins, superAdmin: superAdminEmail() });
  } catch {
    return Response.json({ error: "Falha ao ler a equipe administrativa." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "admins.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Firestore não configurado neste ambiente." }, { status: 503 });
  }

  let body: { email?: unknown; role?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role;
  const name = String(body.name ?? "").trim().slice(0, 80);

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!isAdminRole(role)) {
    return Response.json(
      { error: "Papel inválido — use um dos 7 papéis da §13." },
      { status: 400 },
    );
  }
  if (email === superAdminEmail()) {
    return Response.json(
      { error: "O super admin já é Administrador — não é preciso cadastrá-lo." },
      { status: 409 },
    );
  }

  const ref = db.collection("adminUsers").doc(email);
  if ((await ref.get()).exists) {
    return Response.json({ error: `${email} já faz parte da equipe.` }, { status: 409 });
  }

  let uid = "";
  try {
    const auth = getAdminAuth();
    const user = auth ? await auth.getUserByEmail(email) : null;
    uid = user?.uid ?? "";
  } catch {
    // conta ainda não registrada no Auth — o papel é pré-concedido e
    // vale quando o e-mail se autenticar e tiver o e-mail verificado.
    uid = "";
  }

  const now = new Date().toISOString();
  const record: AdminUser = {
    email,
    ...(uid ? { uid } : {}),
    ...(name ? { name } : {}),
    role: role as AdminRole,
    active: true,
    grantedBy: gate.email,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(plainDoc(record));

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Equipe",
    entity: "adminUser",
    entityId: email,
    summary: `Concedeu o papel ${ADMIN_ROLE_LABELS[record.role]} para ${email}`,
    after: record,
  });

  return Response.json({ ok: true, admin: record });
}
