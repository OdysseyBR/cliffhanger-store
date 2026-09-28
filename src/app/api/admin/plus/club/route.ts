import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getCatalogTargets } from "@/lib/admin-targets";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizeClubBoxInput } from "@/lib/plus-fields";
import { listClubBoxesAdmin, saveClubBox } from "@/lib/plus-admin";

/**
 * §26 — Clube do Leitor no painel: caixas mensais do Clube do Leitor
 * (produto, período, elegibilidade e status operacional), separado do
 * Cliffhanger Club de pontos (§18).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "plus.view");
  if (isGateResponse(gate)) return gate;

  try {
    const [items, options] = await Promise.all([listClubBoxesAdmin(), getCatalogTargets()]);
    return Response.json({ items, options });
  } catch {
    return Response.json({ error: "Falha ao ler as caixas do Clube do Leitor." }, { status: 500 });
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

  const parsed = sanitizeClubBoxInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const box = parsed.item;

  const saved = await saveClubBox(box);
  if (!saved) {
    return Response.json({ error: "Falha ao gravar a caixa." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Cliffhanger+",
    entity: "clubBox",
    entityId: box.id,
    summary: `Criou a caixa “${box.title}” (${box.month}, ${box.status})`,
    after: box,
  });

  return Response.json({ ok: true, item: saved }, { status: 201 });
}
