import { getProducts } from "@/lib/data";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import { claimDrop, getDrop, getSubscription } from "@/lib/plus";

/**
 * §15/§25 — resgate de um Drop pela conta.
 *
 * POST → valida assinatura ativa, plano mínimo, janela de disponibilidade e
 *        registra o resgate (`dropClaims`). Temporário dá acesso enquanto a
 *        assinatura durar; PERMANENTE vai para `libraries/{uid}` e fica
 *        mesmo após o cancelamento (§25).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser(request);
  if (isUserGateResponse(gate)) return gate;

  const { id } = await ctx.params;
  const dropId = decodeURIComponent(id ?? "").slice(0, 140);
  if (!dropId) {
    return Response.json({ error: "Drop inválido." }, { status: 400 });
  }

  const drop = await getDrop(dropId);
  if (!drop) {
    return Response.json({ error: "Drop não encontrado." }, { status: 404 });
  }

  const subscription = await getSubscription(gate.uid);
  if (!subscription) {
    return Response.json(
      { error: "Assinatura ativa necessária para resgatar Drops." },
      { status: 403 },
    );
  }

  const products = await getProducts();
  const result = await claimDrop({
    uid: gate.uid,
    email: gate.email,
    drop,
    subscription,
    products,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    claim: result.claim,
    granted: result.granted,
    alreadyHad: result.alreadyHad,
    permanence: drop.permanence,
  });
}
