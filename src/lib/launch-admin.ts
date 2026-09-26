import "server-only";
import { writeAudit } from "@/lib/audit";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AdminContext } from "@/lib/admin-guard";
import type { AuditAction } from "@/lib/audit";
import type { Launch } from "@/lib/types";

/**
 * §15 — servidor do módulo Pré-vendas (§12): listagem ordenada pela data de
 * lançamento, unicidade de slug (a página pública é servida por slug),
 * validação dos produtos vinculados e registro na auditoria (§13).
 *
 * A escrita cobre apenas os campos §15 — arte, sinopse, trailer e redes
 * sociais do lançamento pertencem ao módulo Lançamentos (§20).
 */

type AdminDb = NonNullable<ReturnType<typeof getAdminDb>>;

const FIELD_LABELS: Record<string, string> = {
  title: "título",
  slug: "slug",
  preOrder: "pré-venda",
  releaseDate: "data de lançamento",
  shipForecast: "previsão de envio",
  notifyOnRelease: "notificação",
  lots: "lotes",
  productIds: "produtos",
};

/** Título legível do lançamento (com destaque, quando houver). */
export function launchTitle(launch: Launch): string {
  const highlight = typeof launch.highlight === "string" ? launch.highlight.trim() : "";
  return highlight ? `${launch.title} — ${highlight}` : launch.title;
}

/** Leitura ordenada da coleção `launches` (mais próximo primeiro). */
export async function listLaunches(db: AdminDb): Promise<Launch[]> {
  const snap = await db.collection("launches").orderBy("releaseDate", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Launch);
}

/** Slug já usado por outro lançamento (página pública por slug). */
export async function isLaunchSlugTaken(
  db: AdminDb,
  slug: string,
  exceptId: string | null,
): Promise<boolean> {
  const snap = await db.collection("launches").where("slug", "==", slug).limit(2).get();
  return snap.docs.some((doc) => doc.id !== exceptId);
}

/** Produtos selecionados que não existem mais no catálogo. */
export async function missingProducts(db: AdminDb, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const snap = await db.collection("products").get();
  const existing = new Set(snap.docs.map((doc) => doc.id));
  return [...new Set(ids.filter((id) => !existing.has(id)))];
}

/** Campos §15 alterados entre duas versões, em português (auditoria). */
export function changedLaunchFields(before: Launch | undefined, after: Launch): string[] {
  if (!before) return [];
  const changed: string[] = [];
  const read = (item: Launch, key: string): unknown =>
    (item as unknown as Record<string, unknown>)[key];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const from = read(before, key);
    const to = read(after, key);
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) changed.push(label);
  }
  return changed;
}

/** Grava a alteração da pré-venda na trilha de auditoria (§13). */
export async function auditLaunchChange(
  ctx: AdminContext,
  action: AuditAction,
  launch: Launch,
  changed: string[],
  previous?: Launch,
): Promise<void> {
  const title = launchTitle(launch);
  const summary =
    action === "criar"
      ? `Criou pré-venda ${title}`
      : action === "excluir"
        ? `Excluiu pré-venda ${title}`
        : `Atualizou pré-venda ${title}${changed.length ? `: ${changed.join(", ")}` : " — revisão de cadastro"}`;

  await writeAudit({
    actor: ctx.email,
    uid: ctx.uid,
    role: ctx.role,
    action,
    module: "Pré-vendas",
    entity: "launch",
    entityId: launch.id || title,
    summary,
    before: action === "criar" ? undefined : (previous ?? launch),
    after: action === "excluir" ? undefined : launch,
  });
}

export { getAdminDb };
export type { AdminDb };
