import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import { claimLibraryItems, getLibrary } from "@/lib/library";
import { getProducts } from "@/lib/data";

/**
 * Biblioteca digital (Doc Mestre §8).
 *
 * GET  → itens + progresso da conta (Bearer do usuário).
 * POST → sincroniza compras de visitante para a conta ({ productIds }).
 *
 * Sem token válido responde 401; sem Firestore responde 503 — o client
 * cai no espelho local (`library-client.ts`).
 */

async function verifyUid(request: Request): Promise<string | null> {
  const bearer = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!bearer) return null;
  const app = getAdminApp();
  if (!app) return null;
  try {
    return (await getAuth(app).verifyIdToken(bearer)).uid;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) {
    return Response.json({ error: "Sessão necessária." }, { status: 401 });
  }
  if (!getAdminDb()) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }
  try {
    const library = await getLibrary(uid);
    return Response.json(library ?? { items: [], progress: {} });
  } catch {
    return Response.json(
      { error: "Falha ao ler a biblioteca." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const uid = await verifyUid(request);
  if (!uid) {
    return Response.json({ error: "Sessão necessária." }, { status: 401 });
  }
  if (!getAdminDb()) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let payload: { productIds?: unknown };
  try {
    payload = (await request.json()) as { productIds?: unknown };
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const productIds = Array.isArray(payload.productIds)
    ? payload.productIds.filter((v): v is string => typeof v === "string").slice(0, 50)
    : [];

  if (productIds.length === 0) {
    return Response.json({ claimed: 0 });
  }

  try {
    const products = await getProducts();
    const claimed = await claimLibraryItems(uid, productIds, products);
    const library = await getLibrary(uid);
    return Response.json({
      claimed,
      items: library?.items ?? [],
      progress: library?.progress ?? {},
    });
  } catch {
    return Response.json(
      { error: "Falha ao sincronizar a biblioteca." },
      { status: 500 },
    );
  }
}
