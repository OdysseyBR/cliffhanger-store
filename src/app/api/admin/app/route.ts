import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import {
  DEFAULT_APP_CONTENT,
  normalizeAppContent,
  sanitizeAppContent,
} from "@/lib/app-content";

/**
 * §33 — Aplicativo no painel: leitura e gravação de `site/app`
 * (destaques, eventos, conteúdos extras, scanner e experiências).
 * Permissão emprestada de Notificações (§33 lista notificações entre os
 * conteúdos do app) — a matriz continua com 41 permissões (§35).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "notifications.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("site").doc("app").get();
    const content = snap.exists
      ? normalizeAppContent(snap.data())
      : { ...DEFAULT_APP_CONTENT };
    return Response.json({ content });
  } catch {
    return Response.json({ error: "Falha ao ler o conteúdo do aplicativo." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const gate = await requireAdmin(request, "notifications.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { content?: unknown };
  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeAppContent(body?.content);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const content = parsed.item;

  const previousSnap = await db.collection("site").doc("app").get();
  const hadContent = previousSnap.exists;
  const previous = hadContent
    ? normalizeAppContent(previousSnap.data())
    : { ...DEFAULT_APP_CONTENT };

  try {
    await db.collection("site").doc("app").set(plainDoc(content));
  } catch {
    return Response.json({ error: "Falha ao gravar o conteúdo do aplicativo." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: hadContent ? "editar" : "criar",
    module: "Aplicativo",
    entity: "appContent",
    entityId: "site/app",
    summary: `Atualizou o app: ${content.highlights.length} destaque(s), ${content.events.length} evento(s), ${content.extras.length} conteúdo(s) extra(s), scanner ${content.scanner.enabled ? "ativo" : "inativo"}`,
    before: previous,
    after: content,
  });

  return Response.json({ ok: true, content });
}
