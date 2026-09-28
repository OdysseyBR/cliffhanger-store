import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import type { QrCatalogOption } from "@/lib/qr-fields";
import type { Product, Work } from "@/lib/types";

/**
 * Alvos do catálogo oferecidos pelo painel para apontar conteúdo —
 * usados pelo Drop (§25, conteúdo do resgate) e pelo QR Code (§34,
 * obra/produto/audiobook). Leitura tolerante: sem Firestore, devolve vazio.
 */
export interface CatalogTargets {
  obras: QrCatalogOption[];
  produtos: QrCatalogOption[];
}

export async function getCatalogTargets(): Promise<CatalogTargets> {
  try {
    const db = getAdminDb();
    if (!db) return { obras: [], produtos: [] };

    const [worksSnap, productsSnap] = await Promise.all([
      db.collection("works").select("title", "slug").limit(400).get(),
      db.collection("products").select("title", "slug", "type", "digital").limit(500).get(),
    ]);

    const obras: QrCatalogOption[] = worksSnap.docs
      .map((doc) => doc.data() as Partial<Work>)
      .filter((work) => typeof work.slug === "string" && typeof work.title === "string")
      .map((work) => ({
        id: work.slug as string,
        slug: work.slug as string,
        title: work.title as string,
      }));

    const produtos: QrCatalogOption[] = productsSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Partial<Product>) }))
      .filter((p) => typeof p.slug === "string" && typeof p.title === "string")
      .map((p) => ({
        id: p.id,
        slug: p.slug as string,
        title: p.title as string,
        type: p.type as string,
        digital: Boolean(p.digital),
      }));

    return { obras, produtos };
  } catch {
    return { obras: [], produtos: [] };
  }
}
