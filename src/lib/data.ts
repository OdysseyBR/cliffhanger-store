import { catalog as localCatalog } from "@/data/catalog";
import { launches as localLaunches } from "@/data/launches";
import { getAdminDb, revive } from "@/lib/firebase-admin";
import type {
  Author,
  Catalog,
  Collection,
  Launch,
  Product,
  ProductCategory,
  Universe,
  Work,
} from "@/lib/types";

/**
 * Camada de dados do catálogo.
 *
 * Prioridade:
 *   1. Cloud Firestore (collections: universes, authors, works, products, collections)
 *   2. Catálogo local de demonstração (src/data/catalog.ts)
 *
 * Qualquer falha de rede/credencial cai silenciosamente no catálogo local,
 * garantindo que a loja funcione mesmo sem Firestore configurado.
 */

const CACHE_KEY = "__cliffhanger_catalog__";
const CACHE_TTL_MS = 30_000;
type CatalogCache = { promise: Promise<Catalog>; at: number };
const globalCache = globalThis as unknown as Record<string, CatalogCache | undefined>;

function collectionOf<T>(data: Record<string, unknown>, name: string): T[] {
  const value = data[name];
  return Array.isArray(value) ? (value as T[]) : [];
}

async function readCollection<T>(db: FirebaseFirestore.Firestore, name: string): Promise<T[]> {
  const snap = await db.collection(name).limit(500).get();
  return snap.docs.map((doc) => revive({ id: doc.id, ...doc.data() }) as T);
}

async function loadCatalog(): Promise<Catalog> {
  if (process.env.CATALOG_SOURCE === "local") return localCatalog;

  const db = getAdminDb();
  if (!db) return localCatalog;

  try {
    const [universes, authors, works, products, collections, launchDocs] = await Promise.all([
      readCollection<Universe>(db, "universes"),
      readCollection<Author>(db, "authors"),
      readCollection<Work>(db, "works"),
      readCollection<Product>(db, "products"),
      readCollection<Collection>(db, "collections"),
      readCollection<Launch>(db, "launches"),
    ]);

    if (products.length === 0) return localCatalog;

    return {
      universes,
      authors,
      works,
      products,
      collections,
      launches: launchDocs.length > 0 ? launchDocs : localLaunches,
    };
  } catch (error) {
    console.warn("[catalog] Firestore indisponível, usando catálogo local:", error);
    return localCatalog;
  }
}

/**
 * Catálogo em memória com TTL. O `invalidateCatalog()` só limpa o processo que
 * chamou a API — na Vercel as páginas e os handlers rodam em lambdas separadas
 * — então o TTL limita a estabilidade: no pior caso a loja enxerga a escrita em
 * 30s mesmo sem invalidação cruzada.
 */
export function getCatalog(): Promise<Catalog> {
  const entry = globalCache[CACHE_KEY];
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.promise;
  globalCache[CACHE_KEY] = { promise: loadCatalog(), at: Date.now() };
  return globalCache[CACHE_KEY]!.promise;
}

/**
 * Invalida o cache do catálogo — chamada pelas APIs de escrita do
 * painel (produtos, etc.) para que a loja reflita a alteração na
 * hora, sem esperar restart do processo.
 */
export function invalidateCatalog(): void {
  delete globalCache[CACHE_KEY];
}

// ---------------------------------------------------------------------------
// Leituras derivadas
// ---------------------------------------------------------------------------
export async function getProducts(): Promise<Product[]> {
  const { products } = await getCatalog();
  return products;
}

export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.category === category);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}

export async function getWorks(): Promise<Work[]> {
  const { works } = await getCatalog();
  return works;
}

export async function getWorkBySlug(slug: string): Promise<Work | undefined> {
  const works = await getWorks();
  return works.find((w) => w.slug === slug);
}

export async function getUniverses(): Promise<Universe[]> {
  const { universes } = await getCatalog();
  return universes;
}

export async function getUniverseBySlug(slug: string): Promise<Universe | undefined> {
  const universes = await getUniverses();
  return universes.find((u) => u.slug === slug);
}

export async function getAuthors(): Promise<Author[]> {
  const { authors } = await getCatalog();
  return authors;
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  const authors = await getAuthors();
  return authors.find((a) => a.slug === slug);
}

export async function getCollections(): Promise<Collection[]> {
  const { collections } = await getCatalog();
  return collections;
}

/** Páginas de lançamento (Documento Mestre 13.1). */
export async function getLaunches(): Promise<Launch[]> {
  const { launches } = await getCatalog();
  return [...launches].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

/**
 * Pré-venda por slug com leitura ao vivo (§15). A página pública é dinâmica e
 * precisa refletir criação, edição e exclusão na hora: o cache do catálogo é
 * por processo e o `invalidateCatalog()` das APIs não alcança o processo que
 * renderiza a página. Sem Firestore (ou coleção vazia) cai no catálogo local.
 */
export async function getLaunchBySlug(slug: string): Promise<Launch | undefined> {
  if (process.env.CATALOG_SOURCE !== "local") {
    const db = getAdminDb();
    if (db) {
      try {
        const snap = await db.collection("launches").limit(500).get();
        const docs = snap.docs.map((doc) => revive({ id: doc.id, ...doc.data() }) as Launch);
        if (docs.length > 0) return docs.find((l) => l.slug === slug);
      } catch (error) {
        console.warn("[launch] Firestore indisponível, usando catálogo local:", error);
      }
    }
  }
  const launches = await getLaunches();
  return launches.find((l) => l.slug === slug);
}

/** Mais vendidos (menor salesRank primeiro). */
export function bestSellers(products: Product[]): Product[] {
  return [...products]
    .filter((p) => typeof p.salesRank === "number")
    .sort((a, b) => (a.salesRank ?? 0) - (b.salesRank ?? 0));
}

export function launches(products: Product[]): Product[] {
  return [...products]
    .filter((p) => p.badge === "LANÇAMENTO" || p.badge === "NOVO" || p.badge === "PRÉ-VENDA")
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function offers(products: Product[]): Product[] {
  return products.filter((p) => p.compareAt && p.compareAt > p.price);
}

/** Busca global: obras, produtos, autores e universos (seção 6.3). */
export interface SearchResults {
  products: Product[];
  works: Work[];
  authors: Author[];
  universes: Universe[];
}

export async function searchCatalog(query: string): Promise<SearchResults> {
  const catalog = await getCatalog();
  const q = query.trim().toLowerCase();

  if (!q) {
    return { products: [], works: [], authors: [], universes: [] };
  }

  const match = (...fields: (string | undefined)[]) =>
    fields.some((f) => (f ?? "").toLowerCase().includes(q));

  return {
    products: catalog.products.filter((p) => match(p.title, p.description, p.type)),
    works: catalog.works.filter((w) => match(w.title, w.subtitle, w.synopsis)),
    authors: catalog.authors.filter((a) => match(a.name, a.bio)),
    universes: catalog.universes.filter((u) => match(u.name, u.tagline, u.description)),
  };
}

/** Mapeia IDs vindos do Firestore para as entidades do catálogo. */
export function mapCatalog(
  catalog: Catalog,
): {
  workById: Record<string, Work>;
  authorById: Record<string, Author>;
  universeById: Record<string, Universe>;
} {
  return {
    workById: Object.fromEntries(catalog.works.map((w) => [w.id, w])),
    authorById: Object.fromEntries(catalog.authors.map((a) => [a.id, a])),
    universeById: Object.fromEntries(catalog.universes.map((u) => [u.id, u])),
  };
}

export { localCatalog, collectionOf };
