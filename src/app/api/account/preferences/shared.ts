import { getAdminDb, revive } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import {
  sanitizeAccountPrefs,
  sanitizeNotifyPrefs,
} from "@/lib/account-fields";
import { readAccountPrefs, readNotifyPrefs, writeCustomerFields } from "@/lib/account-prefs";

/**
 * §9/§10/§11 — preferências da conta (`/api/account/preferences/*`).
 * Rotas finas sobre os helpers de `account-prefs`.
 */

function noDb() {
  return Response.json(
    { error: "Preferências indisponíveis neste ambiente." },
    { status: 503 },
  );
}

async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
}

export async function handleGet(
  request: Request,
  kind: "notifications" | "privacy" | "prefs",
): Promise<Response> {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;
  if (!getAdminDb()) return noDb();

  if (kind === "notifications") {
    return Response.json({ prefs: await readNotifyPrefs(user.uid) });
  }
  if (kind === "privacy") {
    const db = getAdminDb();
    try {
      const snap = await db!.collection("customers").doc(user.uid).get();
      const raw = snap.exists ? (revive(snap.data()) as { marketingConsent?: unknown }).marketingConsent : undefined;
      return Response.json({ marketingConsent: raw !== false });
    } catch {
      return Response.json({ marketingConsent: true });
    }
  }
  return Response.json({ prefs: await readAccountPrefs(user.uid) });
}

export async function handlePut(
  request: Request,
  kind: "notifications" | "privacy" | "prefs",
): Promise<Response> {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;
  if (!getAdminDb()) return noDb();

  const body = await readBody(request);
  if (body instanceof Response) return body;

  if (kind === "notifications") {
    const parsed = sanitizeNotifyPrefs(body?.prefs);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    if (!(await writeCustomerFields(user.uid, user.email, { notifyPrefs: parsed.item }))) {
      return Response.json({ error: "Falha ao salvar." }, { status: 500 });
    }
    return Response.json({ ok: true, prefs: parsed.item });
  }

  if (kind === "privacy") {
    const consent = body?.marketingConsent !== false;
    if (!(await writeCustomerFields(user.uid, user.email, { marketingConsent: consent }))) {
      return Response.json({ error: "Falha ao salvar." }, { status: 500 });
    }
    return Response.json({ ok: true, marketingConsent: consent });
  }

  const parsed = sanitizeAccountPrefs(body?.prefs);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  if (!(await writeCustomerFields(user.uid, user.email, { prefs: parsed.item }))) {
    return Response.json({ error: "Falha ao salvar." }, { status: 500 });
  }
  return Response.json({ ok: true, prefs: parsed.item });
}
