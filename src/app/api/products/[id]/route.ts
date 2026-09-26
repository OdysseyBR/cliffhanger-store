import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import { sanitizeProduct } from "@/lib/product-fields";
import type { Product } from "@/lib/types";

/**
 * Edição/exclusão de um item do catálogo pelo painel (papel com
 * `products.edit` — §13). Params de rota são Promise nesta versão do
 * Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Item não encontrado." }, { status: 404 });
}

/** Resumo legível das mudanças relevantes do item (auditoria §13). */
function summarizeChanges(before: Partial<Product>, after: Product): string {
  const bits: string[] = [];
  if (before.title !== after.title) bits.push(`título “${after.title}”`);
  if (before.price !== after.price) {
    bits.push(
      `preço ${Number(before.price ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} → ${after.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    );
  }
  if (before.stock !== after.stock) bits.push(`estoque ${before.stock ?? 0} → ${after.stock}`);
  if (before.compareAt !== after.compareAt) bits.push("preço promocional alterado");
  if (before.badge !== after.badge) bits.push(`selo ${after.badge ?? "removido"}`);
  if (before.releaseDate !== after.releaseDate) bits.push("data de lançamento alterada");
  if (before.digital !== after.digital) bits.push(after.digital ? "virou digital" : "virou físico");
  return bits.length ? bits.join(", ") : "dados do item revisados";
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "products.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("products").doc(id);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  let product: Product | null = null;
  try {
    const body = (await request.json()) as { product?: unknown };
    product = sanitizeProduct(body?.product);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!product) {
    return Response.json({ error: "Dados do produto inválidos." }, { status: 400 });
  }
  if (product.id !== id) {
    return Response.json(
      { error: "O id do item não pode ser alterado." },
      { status: 400 },
    );
  }

  const duplicate = await db
    .collection("products")
    .where("slug", "==", product.slug)
    .limit(1)
    .get();
  if (!duplicate.empty && duplicate.docs[0].id !== id) {
    return Response.json(
      { error: "Já existe um item com esse slug." },
      { status: 409 },
    );
  }

  const previous = existing.data() as Partial<Product>;

  await ref.set(plainDoc(product));
  invalidateCatalog();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Produtos",
    entity: "product",
    entityId: product.id,
    summary: `Atualizou “${product.title}”: ${summarizeChanges(previous, product)}`,
    before: previous,
    after: product,
  });

  return Response.json({ ok: true, product });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(_request, "products.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("products").doc(id);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  const previous = existing.data() as Partial<Product>;
  await ref.delete();
  invalidateCatalog();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Produtos",
    entity: "product",
    entityId: id,
    summary: `Excluiu “${previous.title ?? id}” do catálogo`,
    before: previous,
  });

  return Response.json({ ok: true });
}
