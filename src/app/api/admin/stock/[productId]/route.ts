import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import {
  applyStockAdjust,
  buildMovement,
  movementSummary,
  parseStockAdjust,
  type StockState,
} from "@/lib/stock-fields";
import type { Product } from "@/lib/types";

/**
 * §14 — movimentação de estoque pelo painel (entrada, saída ou ajuste com
 * motivo obrigatório). Grava o novo saldo em `products`, o histórico em
 * `stockMovements` e a alteração relevante na auditoria (§13).
 * Exige `stock.edit`; params de rota são Promise nesta versão do Next.
 */

type RouteCtx = { params: Promise<{ productId: string }> };

function stateOf(data: Partial<Product>): StockState {
  return {
    stock: Math.max(0, Number(data.stock ?? 0)),
    reserved: Math.max(0, Number(data.reserved ?? 0)),
    minStock: Math.max(0, Number(data.minStock ?? 0)),
  };
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "stock.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { productId } = await params;
  const ref = db.collection("products").doc(productId);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const payload = (body ?? {}) as { input?: unknown };
  const parsed = parseStockAdjust(payload.input ?? body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const product = existing.data() as Partial<Product>;
  const before = stateOf(product);
  const applied = applyStockAdjust(before, parsed.input);
  if (!applied.ok) return Response.json({ error: applied.error }, { status: 400 });

  const at = new Date().toISOString();
  const movement = buildMovement({
    id: `mov-${productId}-${Date.now()}`,
    productId,
    productTitle: String(product.title ?? productId),
    input: parsed.input,
    before,
    after: applied.next,
    actor: gate.email,
    at,
  });

  const summary = movementSummary(parsed.input, before, applied.next);

  try {
    await ref.set(plainDoc({ ...applied.next }), { merge: true });
    await db.collection("stockMovements").doc(movement.id).set(plainDoc(movement));
  } catch {
    return Response.json({ error: "Falha ao gravar o estoque." }, { status: 500 });
  }

  invalidateCatalog();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Estoque",
    entity: "product",
    entityId: productId,
    summary: `${product.title ?? productId} — ${summary}`,
    before,
    after: applied.next,
  });

  return Response.json({
    ok: true,
    stock: applied.next.stock,
    reserved: applied.next.reserved,
    minStock: applied.next.minStock,
    movement,
  });
}
