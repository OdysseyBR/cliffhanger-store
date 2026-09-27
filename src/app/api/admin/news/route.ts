import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeNewsInput } from "@/lib/content-fields";
import type { NewsItem } from "@/lib/types";

/**
 * §12 — Notícias: leitura e criação (editorial, marketing e
 * administrador). Slug único (conflito = 409); publicar fixa a data da
 * primeira publicação. A vitrine pública não existe nas rotas
 * obrigatórias (§22) — entra em etapa futura.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "news.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("news").get();
    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<NewsItem>) }) as NewsItem)
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler as notícias." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "news.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeNewsInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const item = parsed.item;

  const clash = await db.collection("news").where("slug", "==", item.slug).limit(1).get();
  if (!clash.empty) {
    return Response.json(
      { error: `Já existe uma notícia com o slug ${item.slug}.` },
      { status: 409 },
    );
  }

  try {
    await db.collection("news").doc(item.id).set(plainDoc(item));
  } catch {
    return Response.json({ error: "Falha ao gravar a notícia." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Notícias",
    entity: "news",
    entityId: item.id,
    summary: `Criou a notícia “${item.title}” (${item.status === "published" ? "publicada" : "rascunho"})`,
    after: item,
  });

  return Response.json({ ok: true, item }, { status: 201 });
}
