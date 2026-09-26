import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { isCatalogEntity, sanitizeCatalogItem } from "@/lib/catalog-fields";
import {
  auditCatalogChange,
  buildRecord,
  changedFields,
  deleteBlocker,
  getAdminDb,
  isSlugTaken,
  metaOf,
  plainDoc,
  validateReferences,
} from "@/lib/catalog-admin";
import type { CatalogItem } from "@/lib/catalog-admin";

/**
 * Edição e exclusão de um registro dos módulos do grupo Catálogo (§12).
 * Permissão §13: `catalog.edit`. O id é imutável (produtos e obras se
 * referenciam por id); o slug pode mudar, mas precisa continuar único —
 * as páginas públicas são servidas por slug.
 *
 * Params de rota são Promise nesta versão do Next — sempre `await params`.
 */

type RouteCtx = { params: Promise<{ entity: string; id: string }> };

function unknownEntity() {
  return Response.json({ error: "Módulo de catálogo desconhecido." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const { entity, id } = await params;
  if (!isCatalogEntity(entity)) return unknownEntity();

  const gate = await requireAdmin(request, "catalog.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const meta = metaOf(entity);
  const ref = db.collection(meta.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: `${meta.noun[0].toUpperCase()}${meta.noun.slice(1)} não encontrado.` }, { status: 404 });
  }

  let raw: unknown;
  try {
    const body = (await request.json()) as { item?: unknown };
    raw = body?.item;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const clean = sanitizeCatalogItem(entity, raw);
  if (!clean) {
    return Response.json(
      { error: `Dados de ${meta.noun} inválidos — confira nome/título, slug e campos obrigatórios.` },
      { status: 400 },
    );
  }

  const slug = String((clean as { slug: string }).slug);
  if (await isSlugTaken(db, entity, slug, id)) {
    return Response.json(
      { error: `Já existe ${meta.noun} com o slug ${slug} — a loja usa o slug na URL.` },
      { status: 409 },
    );
  }

  const referenceError = await validateReferences(db, entity, clean);
  if (referenceError) return Response.json({ error: referenceError }, { status: 400 });

  const previous = existing.data() as CatalogItem;
  const record = buildRecord(clean, {
    id,
    createdAt: String(previous.createdAt ?? "") || clean.createdAt,
  });
  await ref.set(plainDoc(record));

  const changed = changedFields(entity, previous, record);
  await auditCatalogChange(gate, entity, "editar", record, changed);

  return Response.json({ ok: true, item: record });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const { entity, id } = await params;
  if (!isCatalogEntity(entity)) return unknownEntity();

  const gate = await requireAdmin(request, "catalog.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const meta = metaOf(entity);
  const ref = db.collection(meta.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return Response.json({ error: `${meta.noun[0].toUpperCase()}${meta.noun.slice(1)} não encontrado.` }, { status: 404 });
  }

  const item = { ...((existing.data() ?? {}) as CatalogItem), id } as CatalogItem;

  const blocker = await deleteBlocker(db, entity, id, item);
  if (blocker) return Response.json({ error: blocker }, { status: 409 });

  await ref.delete();
  await auditCatalogChange(gate, entity, "excluir", item, []);

  return Response.json({ ok: true });
}
