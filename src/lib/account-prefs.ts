import "server-only";

import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import {
  defaultAccountPrefs,
  defaultNotifyPrefs,
  type AccountPrefs,
  type NotifyPrefs,
} from "@/lib/account-fields";

/**
 * Leitura/escrita das preferências da conta em `customers/{uid}`
 * (notificações §9, privacidade §10 e experiência §11). Tolerante a
 * documentos antigos: ausência vira padrão.
 */

export async function readCustomerField(uid: string, field: string): Promise<unknown> {
  const db = getAdminDb();
  if (!db) return undefined;
  try {
    const snap = await db.collection("customers").doc(uid).get();
    if (!snap.exists) return undefined;
    return (revive(snap.data()) as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

export async function writeCustomerFields(
  uid: string,
  email: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    await db
      .collection("customers")
      .doc(uid)
      .set(plainDoc({ id: uid, email, ...fields, updatedAt: new Date().toISOString() }), { merge: true });
    return true;
  } catch {
    return false;
  }
}

export async function readNotifyPrefs(uid: string): Promise<NotifyPrefs> {
  const raw = await readCustomerField(uid, "notifyPrefs");
  if (!raw || typeof raw !== "object") return defaultNotifyPrefs();
  const prefs = defaultNotifyPrefs();
  for (const key of Object.keys(prefs) as Array<keyof NotifyPrefs>) {
    const category = (raw as Record<string, unknown>)[key];
    if (!category || typeof category !== "object") continue;
    for (const channel of ["email", "push", "inApp"] as const) {
      const value = (category as Record<string, unknown>)[channel];
      if (typeof value === "boolean") prefs[key][channel] = value;
    }
  }
  return prefs;
}

export async function readAccountPrefs(uid: string): Promise<AccountPrefs> {
  const raw = await readCustomerField(uid, "prefs");
  if (!raw || typeof raw !== "object") return defaultAccountPrefs();
  const data = raw as Partial<AccountPrefs>;
  return {
    appearance: data.appearance === "claro" ? "claro" : "",
    readerFont: data.readerFont === "pequeno" || data.readerFont === "grande" ? data.readerFont : "padrao",
    audioSpeed: [0.75, 1, 1.25, 1.5, 2].includes(Number(data.audioSpeed)) ? Number(data.audioSpeed) : 1,
  };
}
