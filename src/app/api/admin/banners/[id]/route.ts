import { revalidatePath } from "next/cache";
import { sanitizeBanner } from "@/lib/banner-fields";
import { invalidateBanners } from "@/lib/banners";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";

/**
 * Edição/exclusão de um banner pelo painel (Documento de Correção §5).
 * Params de rota são Promise nesta versão do Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Banner não encontrado." }, { status: 404 });
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
  const ref = db.collection("banners").doc(id);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  let raw: unknown;
  try {
    const body = (await request.json()) as { banner?: unknown };
    raw = body?.banner;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const banner = sanitizeBanner(raw, id);
  if (!banner) {
    return Response.json(
      { error: "Dados do banner inválidos (nome, arte, texto alternativo e destino são obrigatórios)." },
      { status: 400 },
    );
  }

  const previous = existing.data() as { createdAt?: string } | undefined;
  const record = {
    ...banner,
    createdAt:
      typeof previous?.createdAt === "string" && previous.createdAt
        ? previous.createdAt
        : banner.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(plainDoc(record));
  invalidateBanners();
  revalidatePath("/", "layout");

  return Response.json({ ok: true, banner: record });
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
  const ref = db.collection("banners").doc(id);
  if (!(await ref.get()).exists) return notFound();

  await ref.delete();
  invalidateBanners();
  revalidatePath("/", "layout");

  return Response.json({ ok: true });
}
