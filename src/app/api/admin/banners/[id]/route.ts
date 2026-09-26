import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { sanitizeBanner } from "@/lib/banner-fields";
import { invalidateBanners } from "@/lib/banners";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import type { Banner } from "@/lib/types";

/**
 * Edição/exclusão de um banner pelo painel (Documento de Correção §5;
 * §13 — `banners.edit`). Params de rota são Promise nesta versão do
 * Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Banner não encontrado." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "banners.edit");
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

  const previous = existing.data() as Partial<Banner> & { createdAt?: string };
  const record: Banner = {
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

  const bits: string[] = [];
  if (previous.active !== record.active) bits.push(record.active ? "ativado" : "desativado");
  if (previous.name !== record.name) bits.push(`nome → “${record.name}”`);
  if (previous.destinationValue !== record.destinationValue || previous.destinationType !== record.destinationType) {
    bits.push(`destino → ${record.destinationType}: ${record.destinationValue}`);
  }
  if (previous.order !== record.order) bits.push(`ordem → ${record.order}`);
  if (previous.startsAt !== record.startsAt || previous.endsAt !== record.endsAt) {
    bits.push("agendamento alterado");
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: record.active === false ? "desativar" : "editar",
    module: "Banners",
    entity: "banner",
    entityId: id,
    summary: `Atualizou o banner “${record.name}”: ${bits.join(", ") || "configuração revisada"}`,
    before: previous,
    after: record,
  });

  return Response.json({ ok: true, banner: record });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(_request, "banners.edit");
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

  const previous = existing.data() as Partial<Banner>;
  await ref.delete();
  invalidateBanners();
  revalidatePath("/", "layout");

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "excluir",
    module: "Banners",
    entity: "banner",
    entityId: id,
    summary: `Excluiu o banner “${previous.name ?? id}”`,
    before: previous,
  });

  return Response.json({ ok: true });
}
