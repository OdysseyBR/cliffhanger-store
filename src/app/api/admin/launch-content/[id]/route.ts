import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import { sanitizeLaunchContent } from "@/lib/content-fields";
import type { Launch } from "@/lib/types";

/**
 * §12/§20 — grava o conteúdo editorial de um lançamento: destaque, arte,
 * sinopse, trailer, redes sociais e vínculos com obra/universo. Só esses
 * campos são mesclados — a mecânica de pré-venda continua intacta no
 * módulo Pré-vendas. Obra/universo vinculados precisam existir.
 */

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "launches.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("launches").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }
  const previous = { id: existing.id, ...(existing.data() as Partial<Launch>) } as Launch;

  let body: { content?: unknown };
  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeLaunchContent(body?.content);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const content = parsed.item;

  if (content.workId) {
    const work = await db.collection("works").doc(content.workId).get();
    if (!work.exists) {
      return Response.json({ error: `Obra ${content.workId} não existe.` }, { status: 400 });
    }
  }
  if (content.universeId) {
    const universe = await db.collection("universes").doc(content.universeId).get();
    if (!universe.exists) {
      return Response.json({ error: `Universo ${content.universeId} não existe.` }, { status: 400 });
    }
  }

  const before = {
    highlight: previous.highlight ?? "",
    cover: previous.cover,
    synopsis: previous.synopsis,
    trailerUrl: previous.trailerUrl ?? "",
    socials: previous.socials ?? [],
    workId: previous.workId ?? "",
    universeId: previous.universeId ?? "",
  };
  const changed = JSON.stringify(before) !== JSON.stringify(content);
  if (!changed) return Response.json({ ok: true, changed: false });

  // replace atômico com o documento completo: campos esvaziados somem
  // de verdade (`plainDoc` remove os `undefined` antes de gravar).
  const updated: Launch = {
    ...previous,
    highlight: content.highlight || undefined,
    cover: content.cover,
    synopsis: content.synopsis,
    trailerUrl: content.trailerUrl || undefined,
    socials: content.socials.length > 0 ? content.socials : undefined,
    workId: content.workId || undefined,
    universeId: content.universeId || undefined,
  };

  try {
    await ref.set(plainDoc(updated));
  } catch {
    return Response.json({ error: "Falha ao gravar o conteúdo do lançamento." }, { status: 500 });
  }

  invalidateCatalog();
  revalidatePath("/", "layout");
  revalidatePath("/lancamentos");
  if (previous.slug) revalidatePath(`/lancamentos/${previous.slug}`);

  const bits: string[] = [];
  if ((previous.highlight ?? "") !== content.highlight) bits.push(`destaque “${content.highlight || "removido"}”`);
  if (JSON.stringify(previous.cover) !== JSON.stringify(content.cover)) bits.push("arte refeita");
  if (previous.synopsis !== content.synopsis) bits.push("sinopse revisada");
  if ((previous.trailerUrl ?? "") !== content.trailerUrl) {
    bits.push(content.trailerUrl ? "trailer anexado" : "trailer removido");
  }
  bits.push(`${content.socials.length} link(s) sociais`);

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Lançamentos",
    entity: "launch",
    entityId: id,
    summary: `Atualizou o conteúdo de “${previous.title}”: ${bits.join(", ")}`,
    before,
    after: content,
  });

  return Response.json({ ok: true, changed: true });
}
