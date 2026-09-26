import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import { saveProgress } from "@/lib/library";
import type { Bookmark, ReadingProgress } from "@/lib/types";

/**
 * Progresso/marcadores de leitura e escuta (Doc Mestre §8 — sincronização
 * entre dispositivos). PUT substitui o documento do produto na conta.
 */

async function verifyUid(request: Request): Promise<string | null> {
  const bearer = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!bearer) return null;
  const app = getAdminApp();
  if (!app) return null;
  try {
    return (await getAuth(app).verifyIdToken(bearer)).uid;
  } catch {
    return null;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const uid = await verifyUid(request);
  if (!uid) {
    return Response.json({ error: "Sessão necessária." }, { status: 401 });
  }
  if (!getAdminDb()) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { productId } = await params;
  if (!productId || productId.length > 128) {
    return Response.json({ error: "Produto inválido." }, { status: 400 });
  }

  let payload: Partial<ReadingProgress>;
  try {
    payload = (await request.json()) as Partial<ReadingProgress>;
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const kind: ReadingProgress["kind"] =
    payload.kind === "audiobook" ? "audiobook" : "ebook";

  const bookmarks: Bookmark[] = Array.isArray(payload.bookmarks)
    ? payload.bookmarks
        .filter((b): b is Bookmark => Boolean(b && typeof b.id === "string"))
        .slice(0, 200)
        .map((b) => ({
          id: String(b.id).slice(0, 64),
          label: String(b.label ?? "Marcador").slice(0, 120),
          page: typeof b.page === "number" ? b.page : undefined,
          position: typeof b.position === "number" ? b.position : undefined,
          createdAt:
            typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
        }))
    : [];

  try {
    const progress = await saveProgress(uid, productId, {
      kind,
      page: typeof payload.page === "number" ? Math.max(1, Math.round(payload.page)) : undefined,
      pages: typeof payload.pages === "number" ? Math.max(1, Math.round(payload.pages)) : undefined,
      percent: Number(payload.percent) || 0,
      position:
        typeof payload.position === "number" && payload.position >= 0
          ? payload.position
          : undefined,
      bookmarks,
    });
    return Response.json({ progress });
  } catch {
    return Response.json(
      { error: "Falha ao salvar o progresso." },
      { status: 500 },
    );
  }
}
