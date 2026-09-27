import "server-only";

import { getAdminDb, revive } from "@/lib/firebase-admin";
import type { ShopSettings } from "@/lib/types";

/**
 * §12 — Configurações: leitura das definições da loja (`site/settings`)
 * com padrões seguros. Nunca derruba quem chama: sem Firestore ou sem
 * documento, valem os padrões.
 */

export const DEFAULT_SHOP_SETTINGS: Omit<ShopSettings, "updatedAt"> = {
  freeShippingFrom: 199,
  supportEmail: "suporte@cliffhangerstore.xyz",
  announcementText: "",
  announcementActive: false,
};

export function normalizeSettings(raw: unknown): ShopSettings {
  const data = (raw ?? {}) as Partial<ShopSettings>;
  const free = Number(data.freeShippingFrom);
  const email = typeof data.supportEmail === "string" ? data.supportEmail.trim() : "";
  return {
    freeShippingFrom:
      Number.isFinite(free) && free >= 0 && free <= 100000 ? Math.round(free) : DEFAULT_SHOP_SETTINGS.freeShippingFrom,
    supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : DEFAULT_SHOP_SETTINGS.supportEmail,
    announcementText: typeof data.announcementText === "string" ? data.announcementText.trim().slice(0, 200) : "",
    announcementActive: data.announcementActive === true,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const db = getAdminDb();
    if (!db) return { ...DEFAULT_SHOP_SETTINGS, updatedAt: "" };
    const snap = await db.collection("site").doc("settings").get();
    if (!snap.exists) return { ...DEFAULT_SHOP_SETTINGS, updatedAt: "" };
    return normalizeSettings(revive(snap.data()));
  } catch {
    return { ...DEFAULT_SHOP_SETTINGS, updatedAt: "" };
  }
}
