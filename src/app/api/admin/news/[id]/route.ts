import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeNewsInput } from "@/lib/content-fields";
import type { NewsItem } from "@/lib/types";

/** §12 — edição e exclusão de notícia (id imutável, slug único). */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "news.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("news").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Notícia não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<NewsItem>) } as NewsItem;

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeNewsInput(body?.item, previous);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const item = parsed.item;
  if (item.id !== id) {
    return Response.json({ error: "O id da notícia não pode ser alterado." }, { status: 400 });
  }

  if (item.slug !== previous.slug) {
    const clash = await db.collection("news").where("slug", "==", item.slug).limit(2).get();
    if (clash.docs.some((doc) => doc.id !== id)) {
      return Response.json(
        { error: `Já existe uma notícia com o slug ${item.slug}.` },
        { status: 409 },
      );
    }
  }

  const changed = JSON.stringify({ ...previous, updatedAt: item.updatedAt }) !== JSON.stringify(item);
  if (!changed) return Response.json({ ok: true, changed: false, item });

  try {
    await ref.set(plainDoc(item));
  } catch {
    return Response.json({ error: "Falha ao gravar a notícia." }, { status: 500 });
  }

  const moved =
    previous.status !== item.status
      ? item.status === "published"
        ? "publicada"
        : "devolvida a rascunho"
      : "texto revisado";
  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Notícias",
    entity: "news",
    entityId: id,
    summary: `Atualizou a notícia “${item.title}” (${moved})`,
    before: previous,
    after: item,
  });

  return Response.json({ ok: true, changed: true, item });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "news.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("news").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Notícia não encontrada." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<NewsItem>) } as NewsItem;

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir a notícia." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Notícias",
    entity: "news",
    entityId: id,
    summary: `Excluiu a notícia “${previous.title}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
