import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { sanitizeBanner } from "@/lib/banner-fields";
import { getBanners, invalidateBanners } from "@/lib/banners";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";

/**
 * Módulo Banners do painel (Documento de Correção §5) — lista e criação de
 * banners (arte final única por upload). §13: `banners.view` / `banners.edit`.
 */

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "banners.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ banners: [] });
  }

  const banners = await getBanners();
  return Response.json({ banners });
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "banners.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    const body = (await request.json()) as { banner?: unknown };
    raw = body?.banner;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const id = `bnr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const banner = sanitizeBanner(raw, id);
  if (!banner) {
    return Response.json(
      { error: "Dados do banner inválidos (nome, arte, texto alternativo e destino são obrigatórios)." },
      { status: 400 },
    );
  }

  const ref = db.collection("banners").doc(id);
  if ((await ref.get()).exists) {
    return Response.json({ error: "Já existe um banner com esse id." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const record = { ...banner, createdAt: now, updatedAt: now };
  await ref.set(plainDoc(record));
  invalidateBanners();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "Banners",
    entity: "banner",
    entityId: id,
    summary: `Criou o banner “${record.name}” com destino ${record.destinationType}`,
    after: record,
  });

  return Response.json({ ok: true, banner: record });
}
