import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { DIGITAL_PRODUCT_TYPE, type DigitalModuleKind } from "@/lib/digital-fields";
import type { Product } from "@/lib/types";

/**
 * §12/§8 — leitura do conteúdo digital de um módulo: `kind=pdf` lista os
 * e-books e `kind=audio` os audiobooks (ambos vêm de `products`, a fonte
 * do leitor e do player). Sem `orderBy` no Firestore: a lista é pequena e
 * a ordenação por título é feita aqui para não exigir índice composto.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "digital.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const kindParam = new URL(request.url).searchParams.get("kind");
  if (kindParam !== "pdf" && kindParam !== "audio") {
    return Response.json({ error: "Parâmetro kind deve ser pdf ou audio." }, { status: 400 });
  }
  const kind: DigitalModuleKind = kindParam;

  try {
    const snap = await db
      .collection("products")
      .where("type", "==", DIGITAL_PRODUCT_TYPE[kind])
      .get();

    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<Product>) }) as Product)
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    return Response.json({ items });
  } catch {
    return Response.json(
      { error: "Falha ao ler os produtos digitais." },
      { status: 500 },
    );
  }
}
