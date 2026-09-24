import { revalidatePath } from "next/cache";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCatalog, invalidateCatalog } from "@/lib/data";
import { sanitizeProduct } from "@/lib/product-fields";

/**
 * API do catálogo (Doc Mestre 11.2 — cadastro de produtos).
 *
 * GET  → leitura do catálogo para carrinho/wishlist/biblioteca e para o
 *        formulário do painel (referências de obras/universos/autores).
 * POST → cria item (super admin) e invalida o cache do catálogo para a
 *        loja refletir a alteração sem esperar restart do processo.
 */
export async function GET() {
  const { products, works, universes, authors } = await getCatalog();
  return Response.json({ products, works, universes, authors });
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request);
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

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

  await ref.set(product);
  invalidateCatalog();
  revalidatePath("/", "layout");

  return Response.json({ ok: true, product });
}
