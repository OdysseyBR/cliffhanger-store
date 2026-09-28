import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizePlusPlansInput } from "@/lib/plus-fields";
import { getPlusPlans } from "@/lib/plus";
import { getPlusBoard, savePlusPlans } from "@/lib/plus-admin";

/**
 * §24/§17 — planos do Cliffhanger+ no painel: leitura (planos + stats de
 * assinatura) e gravação da sobrescrita em `site/plus`. Os três planos
 * são configuráveis; Latoy® Focus Multiverse segue como futuro (§24).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "plus.view");
  if (isGateResponse(gate)) return gate;

  try {
    const board = await getPlusBoard();
    return Response.json(board);
  } catch {
    return Response.json({ error: "Falha ao ler o Cliffhanger+." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const gate = await requireAdmin(request, "plus.edit");
  if (isGateResponse(gate)) return gate;

  if (!getAdminDb()) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { plans?: unknown };
  try {
    body = (await request.json()) as { plans?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizePlusPlansInput(body?.plans);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const previous = await getPlusPlans();
  const changed = JSON.stringify(previous) !== JSON.stringify(parsed.item);
  if (!changed) return Response.json({ ok: true, changed: false, plans: previous });

  const saved = await savePlusPlans(parsed.item);
  if (!saved) {
    return Response.json({ error: "Falha ao gravar os planos." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Cliffhanger+",
    entity: "plusPlan",
    entityId: "site/plus",
    summary: `Atualizou os planos: ${saved.plans
      .map((plan) => `${plan.name} R$${plan.price.toFixed(2).replace(".", ",")}`)
      .join(", ")}`,
    before: previous,
    after: saved.plans,
  });

  return Response.json({ ok: true, changed: true, plans: saved.plans, updatedAt: saved.updatedAt });
}
