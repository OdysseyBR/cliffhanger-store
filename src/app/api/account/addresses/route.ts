import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import { sanitizeAddress, type CustomerAddress } from "@/lib/account-fields";

/**
 * §6 — endereços do usuário (`customers/{uid}.addresses`): leitura e
 * criação. Só o dono escreve (sessão Firebase); o principal (`isDefault`)
 * é preenchido automaticamente no checkout.
 */

async function readAddresses(uid: string): Promise<CustomerAddress[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection("customers").doc(uid).get();
    if (!snap.exists) return [];
    const data = revive(snap.data()) as { addresses?: unknown };
    if (!Array.isArray(data.addresses)) return [];
    return data.addresses.filter(
      (address): address is CustomerAddress =>
        Boolean(address) && typeof address === "object" && typeof (address as CustomerAddress).id === "string",
    );
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Endereços indisponíveis neste ambiente." }, { status: 503 });
  }

  return Response.json({ addresses: await readAddresses(user.uid) });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Endereços indisponíveis neste ambiente." }, { status: 503 });
  }

  let body: { address?: unknown };
  try {
    body = (await request.json()) as { address?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeAddress(body?.address, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const current = await readAddresses(user.uid);
  const address: CustomerAddress = {
    ...parsed.item,
    // primeiro endereço vira principal sozinho
    isDefault: current.length === 0 ? true : parsed.item.isDefault,
  };
  if (address.isDefault) {
    for (const other of current) other.isDefault = false;
  }

  try {
    await db
      .collection("customers")
      .doc(user.uid)
      .set(
        plainDoc({ id: user.uid, email: user.email, addresses: [...current, address], updatedAt: new Date().toISOString() }),
        { merge: true },
      );
  } catch {
    return Response.json({ error: "Falha ao salvar o endereço." }, { status: 500 });
  }

  return Response.json({ ok: true, address }, { status: 201 });
}
