import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Review } from "@/lib/types";

/**
 * §12/§19 — Avaliações: leitura com filtro de moderação (atendimento,
 * editorial, marketing e administrador). O envio pelo cliente vive em
 * `POST /api/reviews` (sessão do usuário, §19).
 */

const PAGE_SIZE = 200;

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "reviews.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const status = new URL(request.url).searchParams.get("status");
  if (status !== null && status !== "pendente" && status !== "aprovada" && status !== "rejeitada") {
    return Response.json({ error: "Filtro de status inválido." }, { status: 400 });
  }

  try {
    let query: FirebaseFirestore.Query = db.collection("reviews");
    if (status) query = query.where("status", "==", status);
    const snap = await query.get();
    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<Review>) }) as Review)
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
      .slice(0, PAGE_SIZE);
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler as avaliações." }, { status: 500 });
  }
}
