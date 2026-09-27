import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import { normalizeLibraryItem } from "@/lib/library";
import type {
  AdminLibrary,
  AdminLibraryItem,
  LibraryItem,
  Product,
  ReadingProgress,
} from "@/lib/types";

/**
 * §12/§8 — visão geral das licenças digitais: todas as bibliotecas
 * (`libraries/{uid}`) com itens, progresso e marcadores (subcoleção
 * `progress`), identidade do cliente (`customers/{uid}`, cujo id é o uid)
 * e o catálogo digital que alimenta o seletor de concessão do módulo.
 *
 * Uma única leitura por biblioteca + uma por progresso: o painel lista
 * poucas contas e o join evita uma segunda chamada do client.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "digital.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const [libSnap, custSnap, ebookSnap, audioSnap] = await Promise.all([
      db.collection("libraries").get(),
      db.collection("customers").get(),
      db.collection("products").where("type", "==", "ebook").get(),
      db.collection("products").where("type", "==", "audiobook").get(),
    ]);

    const customers = new Map(
      custSnap.docs.map((doc) => [
        doc.id,
        doc.data() as { name?: string; nome?: string; email?: string },
      ]),
    );

    const products = [...ebookSnap.docs, ...audioSnap.docs].map(
      (doc) => ({ id: doc.id, ...(doc.data() as Partial<Product>) }) as Product,
    );
    const catalogIds = new Set(products.map((product) => product.id));

    const libraries: AdminLibrary[] = await Promise.all(
      libSnap.docs.map(async (doc) => {
        const data = revive(doc.data()) as { items?: unknown[]; updatedAt?: unknown };
        const items = (Array.isArray(data.items) ? data.items : [])
          .map(normalizeLibraryItem)
          .filter((item): item is LibraryItem => item !== null);

        const progressSnap = await doc.ref.collection("progress").get();
        const progress = new Map<string, ReadingProgress>();
        for (const entry of progressSnap.docs) {
          const value = revive(entry.data()) as ReadingProgress;
          if (value?.productId) {
            progress.set(value.productId, { ...value, bookmarks: value.bookmarks ?? [] });
          }
        }

        const identity = customers.get(doc.id) ?? {};
        const adminItems: AdminLibraryItem[] = items.map((item) => {
          const reading = progress.get(item.productId);
          return {
            id: item.id,
            productId: item.productId,
            title: item.title,
            type: item.type,
            purchasedAt: item.purchasedAt,
            allowDownload: item.files.some((file) => file.allowDownload !== false),
            missing: !catalogIds.has(item.productId),
            ...(reading ? { progress: reading } : {}),
          };
        });

        return {
          uid: doc.id,
          name: identity.name || identity.nome || undefined,
          email: identity.email || undefined,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
          items: adminItems,
          progressCount: adminItems.filter((item) => item.progress).length,
          bookmarks: adminItems.reduce(
            (sum, item) => sum + (item.progress?.bookmarks.length ?? 0),
            0,
          ),
        };
      }),
    );

    libraries.sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
    );
    products.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    return Response.json({ libraries, products });
  } catch {
    return Response.json(
      { error: "Falha ao ler as bibliotecas digitais." },
      { status: 500 },
    );
  }
}
