import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import { sanitizeAddress, type CustomerAddress } from "@/lib/account-fields";

/**
 * §6 — edição, exclusão e definição do principal. Excluir o principal
 * promove o mais antigo; esvaziar a lista só zera o automático do
 * checkout (o usuário escolhe outro endereço na compra).
 */

type RouteCtx = { params: Promise<{ id: string }> };

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

async function writeAddresses(uid: string, addresses: CustomerAddress[], email: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    await db
      .collection("customers")
      .doc(uid)
      .set(plainDoc({ id: uid, email, addresses, updatedAt: new Date().toISOString() }), { merge: true });
    return true;
  } catch {
    return false;
  }
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Endereços indisponíveis neste ambiente." }, { status: 503 });
  }

  const { id } = await params;
  let body: { address?: unknown; primary?: unknown };
  try {
    body = (await request.json()) as { address?: unknown; primary?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const current = await readAddresses(user.uid);
  const existing = current.find((address) => address.id === id) ?? null;
  if (!existing) {
    return Response.json({ error: "Endereço não encontrado." }, { status: 404 });
  }

  // atalho: só trocar o principal
  if (body?.primary === true && body?.address === undefined) {
    for (const other of current) other.isDefault = other.id === id;
    if (!(await writeAddresses(user.uid, current, user.email))) {
      return Response.json({ error: "Falha ao salvar o endereço." }, { status: 500 });
    }
    return Response.json({ ok: true, address: current.find((address) => address.id === id) });
  }

  const parsed = sanitizeAddress(body?.address, existing);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const updated = current.map((address) => (address.id === id ? parsed.item : address));
  if (!(await writeAddresses(user.uid, updated, user.email))) {
    return Response.json({ error: "Falha ao salvar o endereço." }, { status: 500 });
  }

  return Response.json({ ok: true, address: parsed.item });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Endereços indisponíveis neste ambiente." }, { status: 503 });
  }

  const { id } = await params;
  const current = await readAddresses(user.uid);
  if (!current.some((address) => address.id === id)) {
    return Response.json({ error: "Endereço não encontrado." }, { status: 404 });
  }

  const remaining = current.filter((address) => address.id !== id);
  const removedDefault = current.find((address) => address.id === id)?.isDefault;
  if (removedDefault && remaining.length > 0) {
    remaining.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    remaining[0].isDefault = true;
  }

  if (!(await writeAddresses(user.uid, remaining, user.email))) {
    return Response.json({ error: "Falha ao excluir o endereço." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
