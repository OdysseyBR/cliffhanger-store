import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (server) — leitura/escrita no Firestore com a
 * service account (variável FIREBASE_SERVICE_ACCOUNT, JSON em linha única).
 * Retorna `null` quando as credenciais não existem, permitindo que a
 * aplicação caia no catálogo local de demonstração.
 */

function parseServiceAccount(): Record<string, string> | null {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    process.env.FIREBASE_ADMIN_KEY ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) return null;

  try {
    // aceita JSON em linha única ou caminho de arquivo
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    return JSON.parse(fs.readFileSync(trimmed, "utf-8"));
  } catch {
    return null;
  }
}

let adminApp: App | null | undefined;
let adminDb: Firestore | null | undefined;

export function getAdminApp(): App | null {
  if (adminApp !== undefined) return adminApp;

  const sa = parseServiceAccount();
  if (!sa || !sa.project_id) {
    adminApp = null;
    return null;
  }

  adminApp =
    getApps()[0] ??
    initializeApp({
      credential: cert(sa),
      projectId: sa.project_id,
    });
  return adminApp;
}

export function getAdminDb(): Firestore | null {
  if (adminDb !== undefined) return adminDb;
  const app = getAdminApp();
  adminDb = app ? getFirestore(app) : null;
  return adminDb;
}

/** Converte Timestamps do Firestore em strings ISO (modelo de domínio). */
export function revive<T>(value: T): T {
  if (value && typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if (typeof v.toDate === "function" && typeof v.toISOString === "undefined") {
      return (v.toDate() as Date).toISOString() as unknown as T;
    }
    if (Array.isArray(value)) {
      return value.map((item) => revive(item)) as unknown as T;
    }
    const out: Record<string, unknown> = {};
    for (const [k, item] of Object.entries(v)) out[k] = revive(item);
    return out as unknown as T;
  }
  return value;
}
