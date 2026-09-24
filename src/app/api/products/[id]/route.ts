import { revalidatePath } from "next/cache";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import { sanitizeProduct } from "@/lib/product-fields";

/**
 * Edição/exclusão de um item do catálogo pelo painel (super admin).
 * Params de rota são Promise nesta versão do Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Item não encontrado." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request);
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
  if (!(await ref.get()).exists) return notFound();

  let product = null;
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

  await ref.set(product);
  invalidateCatalog();
  revalidatePath("/", "layout");

  return Response.json({ ok: true, product });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(_request);
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
  if (!(await ref.get()).exists) return notFound();

  await ref.delete();
  invalidateCatalog();
  revalidatePath("/", "layout");

  return Response.json({ ok: true });
}
