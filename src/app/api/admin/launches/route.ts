import { revalidatePath } from "next/cache";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { invalidateCatalog } from "@/lib/data";
import { sanitizeLaunchInput } from "@/lib/launch-fields";
import {
  auditLaunchChange,
  isLaunchSlugTaken,
  listLaunches,
  missingProducts,
} from "@/lib/launch-admin";

/**
 * §12/§15 — listagem e criação de pré-vendas (coleção `launches`).
 * Leitura com `preorders.view`, escrita com `preorders.edit` (§13);
 * o restante do conteúdo do lançamento pertence ao módulo Lançamentos (§20).
 */

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "preorders.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ items: [] });

  try {
    const items = await listLaunches(db);
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler as pré-vendas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "preorders.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeLaunchInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const { launch } = parsed;
  if (await isLaunchSlugTaken(db, launch.slug, null)) {
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

  const ref = db.collection("launches").doc(launch.id);
  const existing = await ref.get();
  if (existing.exists) {
    return Response.json(
      { error: `Já existe um lançamento com o id ${launch.id}.` },
      { status: 409 },
    );
  }

  try {
    await ref.set(plainDoc(launch));
  } catch {
    return Response.json({ error: "Falha ao gravar a pré-venda." }, { status: 500 });
  }

  invalidateCatalog();
  revalidatePath("/", "layout");
  await auditLaunchChange(gate, "criar", launch, []);

  return Response.json({ item: launch });
}
