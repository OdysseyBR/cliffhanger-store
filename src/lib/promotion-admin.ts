import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import type { Promotion } from "@/lib/types";

/**
 * §16 — validações de campanha que as rotas de Promoções compartilham:
 * cupom, coleção e banner vinculados precisam existir de verdade, senão
 * a campanha nasce apontando para o vazio.
 */

export type AdminDb = NonNullable<ReturnType<typeof getAdminDb>>;

/** Valida os vínculos da campanha contra cupons, coleções e banners reais. */
export async function missingLinks(db: AdminDb, promotion: Promotion): Promise<string | null> {
  const checks: Array<Promise<{ label: string; ok: boolean }>> = [];
  if (promotion.couponCode) {
    checks.push(
      db
        .collection("coupons")
        .doc(promotion.couponCode)
        .get()
        .then((snap) => ({ label: `cupom ${promotion.couponCode}`, ok: snap.exists })),
    );
  }
  if (promotion.collectionId) {
    checks.push(
      db
        .collection("collections")
        .doc(promotion.collectionId)
        .get()
        .then((snap) => ({ label: `coleção ${promotion.collectionId}`, ok: snap.exists })),
    );
  }
  if (promotion.bannerId) {
    checks.push(
      db
        .collection("banners")
        .doc(promotion.bannerId)
        .get()
        .then((snap) => ({ label: `banner ${promotion.bannerId}`, ok: snap.exists })),
    );
  }
  try {
    const results = await Promise.all(checks);
    const missing = results.filter((result) => !result.ok).map((result) => result.label);
    if (missing.length > 0) {
      return `Vínculo(s) inexistente(s) na campanha: ${missing.join(", ")}.`;
    }
    return null;
  } catch {
    return "Falha ao validar os vínculos da campanha.";
  }
}
