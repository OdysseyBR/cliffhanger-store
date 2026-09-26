import "server-only";
import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import type {
  DigitalFile,
  LibraryItem,
  OrderItem,
  Product,
  ReadingProgress,
} from "@/lib/types";

/**
 * Biblioteca digital (Documento Mestre, seção 8).
 *
 * - `libraries/{uid}` = { items: LibraryItem[], updatedAt } — licenças do usuário.
 * - `libraries/{uid}/progress/{productId}` = ReadingProgress (progresso,
 *   última posição e marcadores sincronizados entre dispositivos).
 *
 * Todos os helpers retornam `null` quando o Firestore não está configurado
 * (fallback local da biblioteca é do client — `library-client.ts`).
 */

function isAudioUrl(url: string): boolean {
  return /\.(mp3|m4a|ogg|oga|wav|aac|opus)(\?|#|$)/i.test(url);
}

/** Normaliza um item de biblioteca (formato legado → modelo §8). */
export function normalizeLibraryItem(raw: unknown): LibraryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = revive(raw) as Partial<LibraryItem> & {
    files?: Array<Partial<DigitalFile>>;
  };
  if (!item.productId || typeof item.productId !== "string") return null;

  const type: LibraryItem["type"] =
    item.type === "audiobook" || item.type === "ebook"
      ? item.type
      : item.slug && /audio/i.test(item.slug)
        ? "audiobook"
        : "ebook";

  const rawFiles = (item.files ?? []) as Array<Partial<DigitalFile>>;
  const files: DigitalFile[] = [];
  for (const f of rawFiles) {
    if (!f?.url) continue;
    const url = f.url;
    files.push({
      kind: f.kind === "pdf" || f.kind === "audio" ? f.kind : isAudioUrl(url) ? "audio" : "pdf",
      url,
      name: f.name || "arquivo",
      // itens legados não tinham o flag — download era permitido
      allowDownload: f.allowDownload ?? true,
    });
  }

  return {
    id: item.id || `item-${item.productId}`,
    productId: item.productId,
    orderId: item.orderId,
    title: item.title || "Item digital",
    slug: item.slug,
    type,
    image: item.image,
    files,
    purchasedAt:
      typeof item.purchasedAt === "string"
        ? item.purchasedAt
        : new Date().toISOString(),
  };
}

/** Monta o item de licença a partir do produto (snapshot dos arquivos). */
function itemFromProduct(
  product: Product,
  orderId: string | undefined,
  now: string,
): LibraryItem {
  return {
    id: `item-${product.id}`,
    productId: product.id,
    orderId,
    title: product.title,
    slug: product.slug,
    type: product.type === "audiobook" ? "audiobook" : "ebook",
    files: (product.files ?? []).map((f) => ({ ...f })),
    purchasedAt: now,
  };
}

/** Lê itens + progresso da biblioteca do usuário. */
export async function getLibrary(
  uid: string,
): Promise<{ items: LibraryItem[]; progress: Record<string, ReadingProgress> } | null> {
  const db = getAdminDb();
  if (!db) return null;

  const base = db.collection("libraries").doc(uid);
  const [doc, progSnap] = await Promise.all([base.get(), base.collection("progress").get()]);

  const data = doc.exists ? (revive(doc.data()) as { items?: unknown[] }) : {};
  const items = (Array.isArray(data.items) ? data.items : [])
    .map(normalizeLibraryItem)
    .filter((item): item is LibraryItem => item !== null);

  const progress: Record<string, ReadingProgress> = {};
  for (const p of progSnap.docs) {
    const value = revive(p.data()) as ReadingProgress;
    if (value?.productId) {
      progress[value.productId] = { ...value, bookmarks: value.bookmarks ?? [] };
    }
  }

  return { items, progress };
}

/**
 * Merge idempotente de itens em `libraries/{uid}` (1 por produto).
 * Retorna os itens resultantes e quantos foram realmente novos, ou `null`
 * sem Firestore.
 */
async function mergeItems(
  uid: string,
  additions: LibraryItem[],
): Promise<{ items: LibraryItem[]; added: number } | null> {
  const db = getAdminDb();
  if (!db || additions.length === 0) return null;

  const ref = db.collection("libraries").doc(uid);
  const snap = await ref.get();
  const current = snap.exists
    ? ((revive(snap.data()) as { items?: unknown[] }).items ?? [])
        .map(normalizeLibraryItem)
        .filter((i): i is LibraryItem => i !== null)
    : [];

  const owned = new Set(current.map((i) => i.productId));
  const merged = [...current];
  let added = 0;
  for (const item of additions) {
    if (!owned.has(item.productId)) {
      merged.push(item);
      owned.add(item.productId);
      added += 1;
    }
  }

  await ref.set(
    plainDoc({ items: merged, updatedAt: new Date().toISOString() }),
    { merge: true },
  );
  return { items: merged, added };
}

/**
 * Concede os itens digitais de um pedido à biblioteca (§8 — controle de
 * acesso/licença: a compra logada libera a leitura/escuta na conta).
 */
export async function grantLibraryItems(
  uid: string,
  orderItems: OrderItem[],
  products: Product[],
  orderId: string,
): Promise<number> {
  const now = new Date().toISOString();
  const additions: LibraryItem[] = [];
  for (const line of orderItems) {
    if (!line.digital) continue;
    const product = products.find((p) => p.id === line.productId);
    if (product) additions.push(itemFromProduct(product, orderId, now));
  }
  if (additions.length === 0) return 0;
  const merged = await mergeItems(uid, additions);
  return merged ? merged.added : 0;
}

/** Sincroniza compras feitas como visitante (ids do localStorage) para a conta. */
export async function claimLibraryItems(
  uid: string,
  productIds: string[],
  products: Product[],
): Promise<number> {
  const now = new Date().toISOString();
  const additions = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p))
    .map((p) => itemFromProduct(p, undefined, now));
  if (additions.length === 0) return 0;
  const merged = await mergeItems(uid, additions);
  return merged ? merged.added : 0;
}

/** Grava progresso/marcadores de um produto (substitui o documento). */
export async function saveProgress(
  uid: string,
  productId: string,
  patch: Omit<ReadingProgress, "productId" | "updatedAt">,
): Promise<ReadingProgress | null> {
  const db = getAdminDb();
  if (!db) return null;

  const progress: ReadingProgress = {
    ...patch,
    productId,
    percent: Math.max(0, Math.min(100, Math.round(Number(patch.percent) || 0))),
    bookmarks: patch.bookmarks ?? [],
    updatedAt: new Date().toISOString(),
  };

  await db
    .collection("libraries")
    .doc(uid)
    .collection("progress")
    .doc(productId)
    .set(plainDoc(progress));

  return progress;
}
