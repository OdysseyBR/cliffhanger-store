import "server-only";

import { getAdminDb, revive } from "@/lib/firebase-admin";
import type { HomeOverride } from "@/lib/types";

/**
 * §12/§3 — curadoria da Home (`site/home`) para a página pública. Retorna
 * `null` sem Firestore ou sem curadoria — a loja usa o automático do
 * tema. Nunca derruba a home: qualquer falha de leitura vira `null`.
 */
export async function getHomeOverride(): Promise<HomeOverride | null> {
  try {
    const db = getAdminDb();
    if (!db) return null;
    const snap = await db.collection("site").doc("home").get();
    if (!snap.exists) return null;
    const data = revive(snap.data()) as Partial<HomeOverride>;
    return {
      destaques: Array.isArray(data.destaques)
        ? data.destaques.filter((id): id is string => typeof id === "string")
        : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    };
  } catch {
    return null;
  }
}
