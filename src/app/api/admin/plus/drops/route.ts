import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getCatalogTargets } from "@/lib/admin-targets";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizeDropInput } from "@/lib/plus-fields";
import { listDropsAdmin, saveDrop } from "@/lib/plus-admin";

/**
 * §25 — Drops no painel: leitura (drops + resgates + alvos do catálogo),
 * criação e exclusão. Um Drop associa conteúdo (ebook/audiobook/obra),
 * plano, período, imagem, descrição e disponibilidade; cada resgate fica
 * registrado em `dropClaims`.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "plus.view");
  if (isGateResponse(gate)) return gate;

  try {
    const [board, options] = await Promise.all([listDropsAdmin(), getCatalogTargets()]);
    return Response.json({ ...board, options });
  } catch {
    return Response.json({ error: "Falha ao ler os Drops." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "plus.edit");
  if (isGateResponse(gate)) return gate;

  if (!getAdminDb()) {
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

  const parsed = sanitizeDropInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const drop = parsed.item;

  const saved = await saveDrop(drop);
  if (!saved) {
    return Response.json({ error: "Falha ao gravar o Drop." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Cliffhanger+",
    entity: "plusDrop",
    entityId: drop.id,
    summary: `Criou o Drop “${drop.title}” (${drop.minPlan}, ${drop.permanence === "permanente" ? "permanente" : "temporário"}, semana ${drop.week} de ${drop.period})`,
    after: drop,
  });

  return Response.json({ ok: true, item: saved }, { status: 201 });
}
