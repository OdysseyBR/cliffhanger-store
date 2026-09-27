import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import type { PaymentMethodRef } from "@/lib/account-fields";

/** §7 — remover método e definir o principal. */

type RouteCtx = { params: Promise<{ id: string }> };

function readMethods(data: unknown): PaymentMethodRef[] {
  const doc = revive(data) as { paymentMethods?: unknown };
  if (!Array.isArray(doc.paymentMethods)) return [];
  return doc.paymentMethods.filter(
    (method): method is PaymentMethodRef =>
      Boolean(method) && typeof method === "object" && typeof (method as PaymentMethodRef).id === "string",
  );
}

export async function PUT(request: Request, { params }: RouteCtx) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Pagamentos indisponíveis neste ambiente." }, { status: 503 });
  }

  const { id } = await params;
  const ref = db.collection("customers").doc(user.uid);
  const snap = await ref.get();
  const current = snap.exists ? readMethods(snap.data()) : [];
  if (!current.some((method) => method.id === id)) {
    return Response.json({ error: "Método não encontrado." }, { status: 404 });
  }

  for (const method of current) method.isDefault = method.id === id;

  try {
    await ref.set(
      plainDoc({ id: user.uid, email: user.email, paymentMethods: current, updatedAt: new Date().toISOString() }),
      { merge: true },
    );
  } catch {
    return Response.json({ error: "Falha ao salvar o método." }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Pagamentos indisponíveis neste ambiente." }, { status: 503 });
  }

  const { id } = await params;
  const ref = db.collection("customers").doc(user.uid);
  const snap = await ref.get();
  const current = snap.exists ? readMethods(snap.data()) : [];
  if (!current.some((method) => method.id === id)) {
    return Response.json({ error: "Método não encontrado." }, { status: 404 });
  }

  const remaining = current.filter((method) => method.id !== id);
  const removedDefault = current.find((method) => method.id === id)?.isDefault;
  if (removedDefault && remaining.length > 0) {
    remaining.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    remaining[0].isDefault = true;
  }

  try {
    await ref.set(
      plainDoc({ id: user.uid, email: user.email, paymentMethods: remaining, updatedAt: new Date().toISOString() }),
      { merge: true },
    );
  } catch {
    return Response.json({ error: "Falha ao excluir o método." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
