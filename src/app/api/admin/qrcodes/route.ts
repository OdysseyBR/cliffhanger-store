import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getCatalogTargets } from "@/lib/admin-targets";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { normalizeQrEntry, sanitizeQrInput } from "@/lib/qr-fields";

/**
 * §34 — QR Codes no painel: lista (com alvos do catálogo para apontar o
 * QR a uma obra, produto ou audiobook) e criação. Conecta produtos
 * físicos ao conteúdo digital da loja.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "digital.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const [qrSnap, targets] = await Promise.all([
      db.collection("qrCodes").orderBy("updatedAt", "desc").limit(200).get(),
      getCatalogTargets(),
    ]);

    const items = qrSnap.docs
      .map((doc) => normalizeQrEntry(doc.id, doc.data()))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return Response.json({ items, options: targets });
  } catch {
    return Response.json({ error: "Falha ao ler os QR Codes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request, "digital.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { item?: unknown };
  try {
    body = (await request.json()) as { item?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeQrInput(body?.item, null);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const entry = parsed.item;

  try {
    const [existing, recent] = await Promise.all([
      db.collection("qrCodes").doc(entry.id).get(),
      db.collection("qrCodes").limit(300).get(),
    ]);
    if (existing.exists) {
      return Response.json({ error: "Já existe um QR Code com esse nome." }, { status: 409 });
    }
    const label = entry.label.toLowerCase();
    const duplicated = recent.docs.some((doc) => {
      const data = doc.data() as { label?: unknown };
      return typeof data.label === "string" && data.label.trim().toLowerCase() === label;
    });
    if (duplicated) {
      return Response.json({ error: "Já existe um QR Code com esse nome." }, { status: 409 });
    }
    await db.collection("qrCodes").doc(entry.id).set(plainDoc(entry));
  } catch {
    return Response.json({ error: "Falha ao gravar o QR Code." }, { status: 500 });
  }

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "criar",
    module: "QR Codes",
    entity: "qrCode",
    entityId: entry.id,
    summary: `Criou o QR Code “${entry.label}” (${entry.type} → ${entry.target})`,
    after: entry,
  });

  return Response.json({ ok: true, item: entry }, { status: 201 });
}
