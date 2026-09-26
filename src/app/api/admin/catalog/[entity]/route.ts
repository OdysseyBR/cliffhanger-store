import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import {
  isCatalogEntity,
  sanitizeCatalogItem,
} from "@/lib/catalog-fields";
import {
  auditCatalogChange,
  buildRecord,
  getAdminDb,
  isSlugTaken,
  listItems,
  metaOf,
  newDocId,
  plainDoc,
  validateReferences,
} from "@/lib/catalog-admin";

/**
 * Listagem e criação dos módulos do grupo Catálogo (§12).
 * Permissões §13: leitura `catalog.view`, escrita `catalog.edit`.
 * `/api/admin/catalog/[entity]` — entity ∈ works | universes | authors |
 * categories | collections (catálogo dinâmico, 5 módulos do painel).
 */

type RouteCtx = { params: Promise<{ entity: string }> };

function unknownEntity() {
  return Response.json({ error: "Módulo de catálogo desconhecido." }, { status: 404 });
}

export async function GET(request: Request, { params }: RouteCtx) {
  const { entity } = await params;
  if (!isCatalogEntity(entity)) return unknownEntity();

  const gate = await requireAdmin(request, "catalog.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ items: [] });

  try {
    const items = await listItems(db, entity);
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Falha ao ler o catálogo." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteCtx) {
  const { entity } = await params;
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

  const id = newDocId(entity, clean);
  const ref = db.collection(meta.collection).doc(id);
  if ((await ref.get()).exists) {
    return Response.json(
      { error: `Já existe ${meta.noun} com o identificador ${id}.` },
      { status: 409 },
    );
  }

  const slug = String((clean as { slug: string }).slug);
  if (await isSlugTaken(db, entity, slug, null)) {
    return Response.json(
      { error: `Já existe ${meta.noun} com o slug ${slug} — a loja usa o slug na URL.` },
      { status: 409 },
    );
  }

  const referenceError = await validateReferences(db, entity, clean);
  if (referenceError) return Response.json({ error: referenceError }, { status: 400 });

  const record = buildRecord(clean, { id, createdAt: new Date().toISOString() });
  await ref.set(plainDoc(record));

  await auditCatalogChange(gate, entity, "criar", record, []);

  return Response.json({ ok: true, item: record });
}
