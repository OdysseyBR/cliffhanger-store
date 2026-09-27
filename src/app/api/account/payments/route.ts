import { getAdminDb, plainDoc, revive } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";
import { sanitizePaymentMethod, type PaymentMethodRef } from "@/lib/account-fields";

/**
 * §7 — métodos de pagamento salvos como REFERÊNCIA (bandeira + 4 dígitos
 * + validade). A loja nunca recebe nem guarda o número completo — o
 * aviso acompanha cada gravação. Adicionar, remover e definir principal.
 */

function readMethods(data: unknown): PaymentMethodRef[] {
  const doc = revive(data) as { paymentMethods?: unknown };
  if (!Array.isArray(doc.paymentMethods)) return [];
  return doc.paymentMethods.filter(
    (method): method is PaymentMethodRef =>
      Boolean(method) && typeof method === "object" && typeof (method as PaymentMethodRef).id === "string",
  );
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Pagamentos indisponíveis neste ambiente." }, { status: 503 });
  }

  try {
    const snap = await db.collection("customers").doc(user.uid).get();
    return Response.json({ methods: snap.exists ? readMethods(snap.data()) : [] });
  } catch {
    return Response.json({ error: "Falha ao ler os métodos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json({ error: "Pagamentos indisponíveis neste ambiente." }, { status: 503 });
  }

  let body: { method?: unknown };
  try {
    body = (await request.json()) as { method?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizePaymentMethod(body?.method, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const ref = db.collection("customers").doc(user.uid);
  const snap = await ref.get();
  const current = snap.exists ? readMethods(snap.data()) : [];
  if (current.length >= 6) {
    return Response.json({ error: "Limite de 6 métodos salvos." }, { status: 400 });
  }

  const method: PaymentMethodRef = {
    ...parsed.item,
    isDefault: current.length === 0 ? true : parsed.item.isDefault,
  };
  if (method.isDefault) {
    for (const other of current) other.isDefault = false;
  }

  try {
    await ref.set(
      plainDoc({ id: user.uid, email: user.email, paymentMethods: [...current, method], updatedAt: new Date().toISOString() }),
      { merge: true },
    );
  } catch {
    return Response.json({ error: "Falha ao salvar o método." }, { status: 500 });
  }

  return Response.json({ ok: true, method }, { status: 201 });
}
