import { revalidatePath } from "next/cache";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import { sanitizeLaunchInput } from "@/lib/launch-fields";
import {
  auditLaunchChange,
  changedLaunchFields,
  isLaunchSlugTaken,
  missingProducts,
} from "@/lib/launch-admin";
import type { Launch } from "@/lib/types";

/**
 * §15 — edição e exclusão de uma pré-venda. Só os campos de pré-venda são
 * regravados: arte, sinopse, trailer e redes sociais do lançamento ficam
 * intactos (conteúdo do módulo Lançamentos, §20). Id imutável, slug único,
 * produtos precisam existir e toda mudança vai para a auditoria (§13).
 */

type RouteCtx = { params: Promise<{ id: string }> };

function notFound() {
  return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "preorders.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("launches").doc(id);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  const previous = { id: existing.id, ...(existing.data() as Partial<Launch>) } as Launch;

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeLaunchInput(body?.item, previous);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const launch = parsed.launch;

  if (launch.slug !== previous.slug && (await isLaunchSlugTaken(db, launch.slug, id))) {
    return Response.json(
      { error: `Já existe um lançamento com o slug ${launch.slug} — a loja usa o slug na URL.` },
      { status: 409 },
    );
  }

  const missing = await missingProducts(db, launch.productIds);
  if (missing.length > 0) {
    return Response.json(
      { error: `Produto(s) inexistente(s) na seleção: ${missing.join(", ")}.` },
      { status: 400 },
    );
  }

  const changed = changedLaunchFields(previous, launch);
  if (changed.length === 0) {
    return Response.json({ ok: true, changed: false, item: launch });
  }

  try {
    await ref.set(plainDoc(launch));
  } catch {
    return Response.json({ error: "Falha ao gravar a pré-venda." }, { status: 500 });
  }

  invalidateCatalog();
  revalidatePath("/", "layout");
  await auditLaunchChange(gate, "editar", launch, changed, previous);

  return Response.json({ ok: true, changed: true, item: launch });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "preorders.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const ref = db.collection("launches").doc(id);
  const existing = await ref.get();
  if (!existing.exists) return notFound();

  const previous = { id: existing.id, ...(existing.data() as Partial<Launch>) } as Launch;

  try {
    await ref.delete();
  } catch {
    return Response.json({ error: "Falha ao excluir a pré-venda." }, { status: 500 });
  }

  invalidateCatalog();
  revalidatePath("/", "layout");
  await auditLaunchChange(gate, "excluir", previous, [], previous);

  return Response.json({ ok: true });
}
