import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { ADMIN_ROLE_LABELS, isAdminRole, type AdminRole } from "@/lib/roles";
import type { AdminUser } from "@/lib/types";

/**
 * §13 — Atualização/remoção de um membro da equipe (papel, nome, acesso
 * ativo). `id` da rota = e-mail normalizado. Somente `admins.edit`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function superAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

function notFound() {
  return Response.json({ error: "Membro da equipe não encontrado." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "admins.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Firestore não configurado neste ambiente." }, { status: 503 });
  }

  const { id } = await params;
  const email = decodeURIComponent(id).trim().toLowerCase();

  if (email === superAdminEmail()) {
    return Response.json(
      { error: "O super admin tem acesso permanente — papel não editável." },
      { status: 409 },
    );
  }

  const ref = db.collection("adminUsers").doc(email);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  let body: { role?: unknown; active?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const previous = existing.data() as AdminUser;
  const nextRole = body.role === undefined ? previous.role : body.role;
  if (!isAdminRole(nextRole)) {
    return Response.json({ error: "Papel inválido." }, { status: 400 });
  }

  const nextActive = body.active === undefined ? previous.active !== false : Boolean(body.active);
  const nextName =
    body.name === undefined ? (previous.name ?? "") : String(body.name).slice(0, 80).trim();

  const record: AdminUser = {
    ...previous,
    email,
    role: nextRole as AdminRole,
    active: nextActive,
    ...(nextName ? { name: nextName } : {}),
    updatedAt: new Date().toISOString(),
  };

  await ref.set(plainDoc(record));

  const changes: string[] = [];
  if (previous.role !== record.role) {
    changes.push(`papel ${ADMIN_ROLE_LABELS[previous.role]} → ${ADMIN_ROLE_LABELS[record.role]}`);
  }
  if (previous.active !== record.active) {
    changes.push(record.active ? "acesso reativado" : "acesso suspenso");
  }
  if ((previous.name ?? "") !== record.name) changes.push("nome atualizado");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: record.active === false ? "desativar" : "editar",
    module: "Equipe",
    entity: "adminUser",
    entityId: email,
    summary: `Atualizou ${email}: ${changes.join(", ") || "nenhuma alteração"}`,
    before: previous,
    after: record,
  });

  return Response.json({ ok: true, admin: record });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "admins.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Firestore não configurado neste ambiente." }, { status: 503 });
  }

  const { id } = await params;
  const email = decodeURIComponent(id).trim().toLowerCase();

  if (email === superAdminEmail()) {
    return Response.json({ error: "O acesso do super admin não pode ser removido." }, { status: 409 });
  }
  if (email === gate.email) {
    return Response.json(
      { error: "Você não pode remover o próprio acesso ao painel." },
      { status: 400 },
    );
  }

  const ref = db.collection("adminUsers").doc(email);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  const previous = existing.data() as AdminUser;
  await ref.delete();

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Equipe",
    entity: "adminUser",
    entityId: email,
    summary: `Removeu ${email} da equipe (papel ${ADMIN_ROLE_LABELS[previous.role] ?? previous.role})`,
    before: previous,
  });

  return Response.json({ ok: true });
}
