import { getAdminDb } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import {
  getPlusPlans,
  getPlusState,
  getSubscription,
  isPlusActive,
  nextBillingFrom,
  saveSubscription,
} from "@/lib/plus";
import { isPlusPlanId, type PlusSubscription } from "@/lib/plus-fields";

/**
 * §15 — estado e gerenciamento da assinatura Cliffhanger+ (billing simulado).
 *
 * GET  → planos, assinatura atual, Drops com estado de resgate, progresso
 *        semanal (§15) e caixas do Clube do Leitor elegíveis.
 * POST → { action: "assinar" | "trocar" | "cancelar", plan? } — nenhuma
 *        cobrança real acontece (decisão do projeto: billing simulado).
 */

export async function GET(request: Request) {
  const gate = await requireUser(request);
  if (isUserGateResponse(gate)) return gate;
  return Response.json(await getPlusState(gate.uid));
}

export async function POST(request: Request) {
  const gate = await requireUser(request);
  if (isUserGateResponse(gate)) return gate;
  const { uid, email } = gate;

  let payload: { action?: string; plan?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const action = payload.action;
  if (action !== "assinar" && action !== "trocar" && action !== "cancelar") {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const current = await getSubscription(uid);
  const active = isPlusActive(current);
  const now = new Date().toISOString();

  if (action === "cancelar") {
    if (!active || !current) {
      return Response.json(
        { error: "Não há assinatura ativa para cancelar." },
        { status: 409 },
      );
    }
    // Billing simulado: cancelamento encerra os benefícios temporários na
    // hora; os itens PERMANENTES resgatados seguem na biblioteca (§25).
    const saved = await saveSubscription({
      ...current,
      status: "cancelado",
      canceledAt: now,
      updatedAt: now,
    });
    if (!saved) {
      return Response.json({ error: "Falha ao cancelar a assinatura." }, { status: 500 });
    }
    return Response.json({ subscription: saved });
  }

  // assinar / trocar → exigem plano válido do catálogo (§24)
  const planId = payload.plan;
  if (!isPlusPlanId(planId)) {
    return Response.json({ error: "Plano inválido." }, { status: 400 });
  }

  if (action === "trocar") {
    if (!active || !current) {
      return Response.json(
        { error: "Não há assinatura ativa para trocar." },
        { status: 409 },
      );
    }
    if (current.plan === planId) {
      return Response.json(
        { error: "Este já é o seu plano atual." },
        { status: 409 },
      );
    }
    const plans = await getPlusPlans();
    const price = plans.find((p) => p.id === planId)?.price ?? current.price;
    const saved = await saveSubscription({
      ...current,
      plan: planId,
      price,
      updatedAt: now,
    });
    if (!saved) {
      return Response.json({ error: "Falha ao trocar o plano." }, { status: 500 });
    }
    return Response.json({ subscription: saved });
  }

  // assinar (novo ou reativação após cancelamento)
  if (active && current) {
    return Response.json(
      { error: "Você já tem uma assinatura ativa. Use a troca de plano." },
      { status: 409 },
    );
  }
  const plans = await getPlusPlans();
  const price = plans.find((p) => p.id === planId)?.price ?? 0;
  const subscription: PlusSubscription = {
    uid,
    email,
    plan: planId,
    price,
    status: "ativo",
    startedAt: now,
    nextBillingAt: nextBillingFrom(),
    updatedAt: now,
  };
  const saved = await saveSubscription(subscription);
  if (!saved) {
    return Response.json({ error: "Falha ao ativar a assinatura." }, { status: 500 });
  }
  return Response.json({ subscription: saved }, { status: 201 });
}
