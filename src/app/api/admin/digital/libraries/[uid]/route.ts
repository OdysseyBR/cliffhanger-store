import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { grantLibraryItem, revokeLibraryItem } from "@/lib/library";
import type { Product } from "@/lib/types";

/**
 * §12/§8 — concessão e revogação de acesso/licença na biblioteca digital
 * de um cliente (coleção `libraries/{uid}`). O id do documento é o uid da
 * conta e `customers/{uid}` guarda a identidade usada na auditoria.
 *
 * POST concede um produto digital já marcado com entrega digital;
 * DELETE revoga um item. Ambos exigem `digital.edit` (§13) e gravam na
 * auditoria (§13) com módulo "Biblioteca Digital".
 */

type RouteCtx = { params: Promise<{ uid: string }> };
type AdminDb = NonNullable<ReturnType<typeof getAdminDb>>;

/** uid Firestore: alfanumérico, hífen e sublinhado (máx. 128). */
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function badUid() {
  return Response.json({ error: "Identificador de cliente inválido." }, { status: 400 });
}

/** Rótulo do dono da biblioteca para a auditoria (nome/e-mail/uid). */
async function identityLabel(db: AdminDb, uid: string): Promise<string> {
  try {
    const snap = await db.collection("customers").doc(uid).get();
    if (snap.exists) {
      const data = snap.data() as { name?: string; nome?: string; email?: string };
      const who = data.name || data.nome || data.email;
      if (who) return who;
    }
  } catch {
    /* sem customers — segue com o uid */
  }
  return uid;
}

async function readProductId(request: Request): Promise<string | Response> {
  let body: { productId?: unknown };
  try {
    body = (await request.json()) as { productId?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    return Response.json({ error: "Informe o produto a conceder/revogar." }, { status: 400 });
  }
  return productId;
}

export async function POST(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "digital.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { uid } = await params;
  if (!UID_RE.test(uid)) return badUid();

  const productId = await readProductId(request);
  if (productId instanceof Response) return productId;

  const snap = await db.collection("products").doc(productId).get();
  if (!snap.exists) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  const product = { id: snap.id, ...(snap.data() as Partial<Product>) } as Product;

  if (product.type !== "ebook" && product.type !== "audiobook") {
    return Response.json(
      { error: "Só produtos digitais (e-book ou audiobook) entram na biblioteca." },
      { status: 400 },
    );
  }
  if (product.digital !== true) {
    return Response.json(
      {
        error: `“${product.title}” não está marcado com entrega digital — ative em ${
          product.type === "ebook" ? "E-books" : "Audiobooks"
        } antes de conceder o acesso.`,
      },
      { status: 400 },
    );
  }

  const granted = await grantLibraryItem(uid, product);
  const owner = await identityLabel(db, uid);

  if (granted) {
    await writeAudit({
      actor: gate.email,
      uid: gate.uid,
      role: gate.role,
      action: "criar",
      module: "Biblioteca Digital",
      entity: "library",
      entityId: uid,
      summary: `Concedeu “${product.title}” à biblioteca de ${owner}`,
      after: { uid, productId: product.id, title: product.title },
    });
  }

  return Response.json({ ok: true, granted });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "digital.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { uid } = await params;
  if (!UID_RE.test(uid)) return badUid();

  const productId = await readProductId(request);
  if (productId instanceof Response) return productId;

  const removed = await revokeLibraryItem(uid, productId);
  if (!removed) {
    return Response.json(
      { error: "Este item não está na biblioteca deste cliente." },
      { status: 404 },
    );
  }

  // prefere o título atual do catálogo quando o item legado não tem um
  let title = removed.title;
  try {
    const snap = await db.collection("products").doc(productId).get();
    if (snap.exists) title = (snap.data() as Partial<Product>).title ?? title;
  } catch {
    /* segue com o título do snapshot */
  }

  const owner = await identityLabel(db, uid);
  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Biblioteca Digital",
    entity: "library",
    entityId: uid,
    summary: `Revogou “${title}” (${productId}) da biblioteca de ${owner}`,
    before: { uid, productId, title },
  });

  return Response.json({ ok: true });
}
