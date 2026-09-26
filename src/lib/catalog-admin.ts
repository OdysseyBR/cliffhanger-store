import "server-only";
import { writeAudit } from "@/lib/audit";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import {
  CATALOG_META,
  sanitizeCatalogItem,
  type CatalogEntity,
  type CatalogEntityMeta,
} from "@/lib/catalog-fields";
import type { AdminContext } from "@/lib/admin-guard";
import type { AuditAction } from "@/lib/audit";
import type {
  Author,
  Category,
  Collection,
  Universe,
  Work,
} from "@/lib/types";

/**
 * §12 — servidor dos módulos do grupo Catálogo (Obras, Universos, Autores,
 * Categorias e Coleções): leitura ordenada, escrita validada, unicidade de
 * slug (as páginas públicas são servidas por slug), bloqueio de exclusão
 * quando o registro ainda é referenciado e registro na auditoria (§13).
 *
 * Cada módulo usa a própria coleção do Firestore — nenhuma escrita
 * acontece fora daqui, e o guard de permissão é aplicado na rota.
 */

type AdminDb = NonNullable<ReturnType<typeof getAdminDb>>;

export type CatalogItem = Work | Universe | Author | Category | Collection;

export function metaOf(entity: CatalogEntity): CatalogEntityMeta {
  return CATALOG_META[entity];
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Título legível do registro (título das obras/coleções, nome dos demais). */
export function itemTitle(item: CatalogItem): string {
  if ("title" in item && str(item.title)) return str(item.title);
  if ("name" in item && str(item.name)) return str(item.name);
  return "registro";
}

function comparValue(item: CatalogItem): { sort: number; name: string } {
  const name = itemTitle(item);
  if ("sort" in item && typeof item.sort === "number") return { sort: item.sort, name };
  if ("year" in item && typeof item.year === "number") return { sort: item.year, name };
  return { sort: 0, name };
}

/** Ordena a listagem (ordem editorial da loja) antes de responder. */
export function sortItems(entity: CatalogEntity, items: CatalogItem[]): CatalogItem[] {
  const meta = metaOf(entity);
  return items.sort((a, b) => {
    const left = comparValue(a);
    const right = comparValue(b);
    if (meta.sortField === "sort" && left.sort !== right.sort) return left.sort - right.sort;
    return left.name.localeCompare(right.name, "pt-BR");
  });
}

/** Lê a coleção inteira (`{id, ...dados}`) já ordenada. */
export async function listItems(
  db: AdminDb,
  entity: CatalogEntity,
): Promise<CatalogItem[]> {
  const meta = metaOf(entity);
  const snap = await db.collection(meta.collection).get();
  const items = snap.docs.map((doc) => {
    const raw = { id: doc.id, ...doc.data() } as CatalogItem & { id: string };
    // normaliza o documento para o cliente receber a forma completa;
    // se algum registro legado não validar, ele continua visível como está
    return sanitizeCatalogItem(entity, raw) ?? raw;
  });
  return sortItems(entity, items);
}

/**
 * Id do documento novo — derivado do slug com o prefixo editorial
 * (wkb-, uni-, aut-, col-); categorias usam o próprio slug.
 * Na edição o id é imutável (produtos referenciam obras/autores por id).
 */
export function newDocId(entity: CatalogEntity, item: CatalogItem): string {
  const meta = metaOf(entity);
  const slug = str((item as { slug?: string }).slug);
  return meta.prefix ? `${meta.prefix}-${slug}` : slug;
}

/** Slug já usado por outro documento da coleção (páginas públicas por slug). */
export async function isSlugTaken(
  db: AdminDb,
  entity: CatalogEntity,
  slug: string,
  exceptId: string | null,
): Promise<boolean> {
  const meta = metaOf(entity);
  const snap = await db
    .collection(meta.collection)
    .where("slug", "==", slug)
    .limit(2)
    .get();
  return snap.docs.some((doc) => doc.id !== exceptId);
}

interface Blocker {
  collection: string;
  field: string;
  label: string;
  /** valor comparado — por padrão é o id do registro */
  value?: (id: string, item: CatalogItem) => string;
}

const BLOCKERS: Record<CatalogEntity, Blocker[]> = {
  works: [
    { collection: "products", field: "workId", label: "produto" },
    { collection: "launches", field: "workId", label: "lançamento" },
  ],
  universes: [
    { collection: "products", field: "universeId", label: "produto" },
    { collection: "works", field: "universeId", label: "obra" },
    { collection: "launches", field: "universeId", label: "lançamento" },
  ],
  authors: [
    { collection: "products", field: "authorId", label: "produto" },
    { collection: "works", field: "authorId", label: "obra" },
  ],
  // `products.category` guarda o slug da categoria (ex.: livros, ebooks)
  categories: [
    {
      collection: "products",
      field: "category",
      label: "produto",
      value: (_id, item) => str((item as { slug?: string }).slug),
    },
  ],
  collections: [],
};

/**
 * Motivo pelo qual a exclusão está bloqueada (ainda há vínculos) ou null
 * quando o registro pode ser excluído com segurança.
 */
export async function deleteBlocker(
  db: AdminDb,
  entity: CatalogEntity,
  id: string,
  item: CatalogItem,
): Promise<string | null> {
  const parts: string[] = [];
  for (const blocker of BLOCKERS[entity]) {
    const value = blocker.value ? blocker.value(id, item) : id;
    if (!value) continue;
    const snap = await db
      .collection(blocker.collection)
      .where(blocker.field, "==", value)
      .limit(1)
      .get();
    if (!snap.empty) parts.push(`${blocker.label}(s)`);
  }
  if (parts.length === 0) return null;
  return `Não é possível excluir — ainda existem ${parts.join(" e ")} usando este registro.`;
}

/**
 * Campos do registro que apontam para produtos — precisam existir de
 * verdade (uma coleção apontando para produto excluído inflaria a contagem
 * exibida na loja). Retorna null quando está tudo certo.
 */
const PRODUCT_REFERENCE_FIELDS: Partial<Record<CatalogEntity, string[]>> = {
  collections: ["productIds"],
};

export async function validateReferences(
  db: AdminDb,
  entity: CatalogEntity,
  item: CatalogItem,
): Promise<string | null> {
  const fields = PRODUCT_REFERENCE_FIELDS[entity];
  if (!fields || fields.length === 0) return null;

  const snap = await db.collection("products").get();
  const existing = new Set(snap.docs.map((doc) => doc.id));
  const missing = new Set<string>();
  for (const field of fields) {
    const values = (item as unknown as Record<string, unknown>)[field];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      const id = typeof value === "string" ? value : "";
      if (id && !existing.has(id)) missing.add(id);
    }
  }

  if (missing.size === 0) return null;
  return `Produto(s) inexistente(s) na seleção: ${[...missing].join(", ")}.`;
}

/** Campos alterados entre duas versões, em português (auditoria §13). */
export function changedFields(
  entity: CatalogEntity,
  before: CatalogItem | undefined,
  after: CatalogItem,
): string[] {
  const meta = metaOf(entity);
  if (!before) return [];
  const changed: string[] = [];
  const read = (item: CatalogItem, key: string): unknown =>
    (item as unknown as Record<string, unknown>)[key];
  for (const [key, label] of Object.entries(meta.fields)) {
    const from = read(before, key);
    const to = read(after, key);
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) changed.push(label);
  }
  return changed;
}

/** Grava a alteração com resumo legível na trilha de auditoria (§13). */
export async function auditCatalogChange(
  ctx: AdminContext,
  entity: CatalogEntity,
  action: AuditAction,
  item: CatalogItem,
  changed: string[],
): Promise<void> {
  const meta = metaOf(entity);
  const title = itemTitle(item);
  const summary =
    action === "criar"
      ? `Criou ${meta.noun} ${title}`
      : action === "excluir"
        ? `Excluiu ${meta.noun} ${title}`
        : `Atualizou ${meta.noun} ${title}${changed.length ? `: ${changed.join(", ")}` : " — revisão de cadastro"}`;

  await writeAudit({
    actor: ctx.email,
    uid: ctx.uid,
    role: ctx.role,
    action,
    module: meta.label,
    entity: meta.entity,
    entityId: str((item as { id?: string }).id) || title,
    summary,
    before: action === "criar" ? undefined : item,
    after: action === "excluir" ? undefined : item,
  });
}

/** Normaliza a gravação: id/createdAt preservados na edição. */
export function buildRecord<T extends CatalogItem>(
  input: T,
  overrides: { id: string; createdAt: string },
): T {
  return { ...input, id: overrides.id, createdAt: overrides.createdAt };
}

export { plainDoc, getAdminDb };
export type { AdminDb };
