import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Launch } from "@/lib/types";

/**
 * §12/§20 — Lançamentos: leitura do conteúdo dos lançamentos para o
 * módulo editorial. A mecânica de pré-venda continua em
 * `/api/admin/launches` (`preorders.view`); aqui a guarda é
 * `launches.view` — editorial, marketing, comercial, estoque e
 * administrador leem (§13).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "launches.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("launches").orderBy("releaseDate", "desc").get();
    const items = snap.docs.map(
      (doc) => ({ id: doc.id, ...(doc.data() as Partial<Launch>) }) as Launch,
    );
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler os lançamentos." }, { status: 500 });
  }
}
