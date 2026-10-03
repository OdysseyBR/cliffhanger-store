import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import { normalizeStatus } from "@/lib/order-status";
import { sanitizeReviewInput } from "@/lib/marketing-fields";
import type { Product, Review } from "@/lib/types";

/**
 * §19 — envio de avaliação pelo cliente logado (estrelas, comentário e
 * fotos). A compra verificada é calculada no servidor (e-mail + produto
 * em `orders`, ignorando cancelados) e toda avaliação entra como
 * pendente para moderação no painel (atendimento/administrador).
 */

/**
 * Compra verificada: o e-mail da sessão comprou o produto. Pedidos
 * legados usam `email` (qualquer caixa) em vez de `customerEmail`, então
 * a comparação é case-insensitive sobre os dois campos; cancelados não
 * contam (§19).
 */
async function isVerifiedPurchase(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  email: string,
  productId: string,
): Promise<boolean> {
  const want = email.trim().toLowerCase();
  if (!want) return false;
  try {
    const snap = await db.collection("orders").limit(200).get();
    return snap.docs.some((doc) => {
      const order = doc.data() as {
        customerEmail?: unknown;
        email?: unknown;
        status?: unknown;
        items?: Array<{ productId?: string }>;
      };
      const owner = String(order.customerEmail ?? order.email ?? "").toLowerCase();
      if (owner !== want) return false;
      if (normalizeStatus(order.status) === "cancelado") return false;
      const items = order.items ?? [];
      return items.some((item) => item.productId === productId);
    });
  } catch {
    return false;
  }
}

/**
 * §19/§7 — lista pública de avaliações aprovadas de um produto. Só
 * `status === "aprovada"` e sem e-mail do autor; usada pela página de
 * produto (dados frescos mesmo com a rota ser estática no build).
 */
export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  if (!productId) {
    return Response.json({ error: "Informe o produto." }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db
      .collection("reviews")
      .where("productId", "==", productId)
      .limit(200)
      .get();
    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<Review>) }))
      .filter((review) => review.status === "aprovada")
      .sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1))
      .slice(0, 60)
      .map(({ id, authorName, rating, comment, photos, verified, createdAt }) => ({
        id,
        authorName: authorName ?? "",
        rating: rating ?? 0,
        comment: comment ?? "",
        photos: photos ?? [],
        verified: verified === true,
        createdAt: createdAt ?? "",
      }));
    return Response.json({ items });
  } catch {
    return Response.json(
      { error: "Falha ao carregar as avaliações." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { review?: unknown };
  try {
    body = (await request.json()) as { review?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeReviewInput(body?.review);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const input = parsed.item;

  const productSnap = await db.collection("products").doc(input.productId).get();
  if (!productSnap.exists) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  const product = { id: productSnap.id, ...(productSnap.data() as Partial<Product>) } as Product;

  const email = input.email || user.email;
  const verified = await isVerifiedPurchase(db, email, input.productId);

  const now = new Date().toISOString();
  const review: Review = {
    id: `rev-${Date.now().toString(36)}-${user.uid.slice(0, 6)}`,
    productId: input.productId,
    productTitle: product.title,
    authorName: input.authorName,
    ...(email ? { email } : {}),
    rating: input.rating,
    comment: input.comment,
    photos: input.photos,
    verified,
    status: "pendente",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection("reviews").doc(review.id).set(plainDoc(review));
  } catch {
    return Response.json({ error: "Falha ao enviar a avaliação." }, { status: 500 });
  }

  return Response.json({ ok: true, item: review }, { status: 201 });
}
