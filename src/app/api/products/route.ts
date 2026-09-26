import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { getCatalog, invalidateCatalog } from "@/lib/data";
import { sanitizeProduct } from "@/lib/product-fields";
import type { Product } from "@/lib/types";

/**
 * API do catálogo (Doc Mestre 11.2 — cadastro de produtos).
 *
 * GET  → leitura do catálogo para carrinho/wishlist/biblioteca e para o
 *        formulário do painel (referências de obras/universos/autores).
 * POST → cria item (papel com `products.edit`, §13) e invalida o cache do
 *        catálogo para a loja refletir a alteração sem esperar restart.
 */
export async function GET() {
  const { products, works, universes, authors } = await getCatalog();
  return Response.json({ products, works, universes, authors });
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "products.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

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

  const ref = db.collection("products").doc(product.id);
  if ((await ref.get()).exists) {
    return Response.json({ error: "Já existe um item com esse id." }, { status: 409 });
  }
  const duplicate = await db
    .collection("products")
    .where("slug", "==", product.slug)
    .limit(1)
    .get();
  if (!duplicate.empty) {
    return Response.json(
      { error: "Já existe um item com esse slug." },
      { status: 409 },
    );
  }

  await ref.set(plainDoc(product));
  invalidateCatalog();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Produtos",
    entity: "product",
    entityId: product.id,
    summary: `Criou o produto “${product.title}” (${product.type})`,
    after: product,
  });

  return Response.json({ ok: true, product });
}
