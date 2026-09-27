import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizePointsAdjust } from "@/lib/marketing-fields";
import type { ClubMember } from "@/lib/types";

/**
 * §12/§18 — ajuste de pontos de um membro (crédito/débito com motivo
 * obrigatório). Cria o membro no primeiro crédito: identidade resolvida
 * em `customers/{uid}` quando existir. O saldo nunca fica negativo e
 * todo ajuste vai para a auditoria (§13).
 */

type RouteCtx = { params: Promise<{ uid: string }> };

const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export async function PUT(request: Request, { params }: RouteCtx) {
  const gate = await requireAdmin(request, "club.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const { uid } = await params;
  if (!UID_RE.test(uid)) {
    return Response.json({ error: "Identificador de membro inválido." }, { status: 400 });
  }

  let body: { adjust?: unknown };
  try {
    body = (await request.json()) as { adjust?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizePointsAdjust(body?.adjust);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { delta, reason } = parsed.item;

  const ref = db.collection("clubMembers").doc(uid);
  const existing = await ref.get();
  const previous = existing.exists
    ? ({ uid: existing.id, ...(existing.data() as Partial<ClubMember>) }) as ClubMember
    : null;
  const before = previous?.points ?? 0;
  const after = before + delta;
  if (after < 0) {
    return Response.json(
      { error: `Saldo insuficiente: o membro tem ${before} ponto(s).` },
      { status: 400 },
    );
  }

  let name = previous?.name;
  let email = previous?.email;
  if (!name || !email) {
    try {
      const customer = await db.collection("customers").doc(uid).get();
      if (customer.exists) {
        const data = customer.data() as { name?: string; nome?: string; email?: string };
        name = name ?? data.name ?? data.nome;
        email = email ?? data.email;
      }
    } catch {
      /* sem customers — segue com o uid */
    }
  }

  const member: ClubMember = {
    uid,
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    points: after,
    updatedAt: new Date().toISOString(),
  };

  try {
    await ref.set(plainDoc(member), { merge: true });
  } catch {
    return Response.json({ error: "Falha ao ajustar os pontos." }, { status: 500 });
  }

  const who = name || email || uid;
  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: "editar",
    module: "Cliffhanger Club",
    entity: "member",
    entityId: uid,
    summary: `${delta > 0 ? "Creditou" : "Debitou"} ${Math.abs(delta)} ponto(s) ${delta > 0 ? "para" : "de"} ${who} (${before} → ${after}): ${reason}`,
    before: previous ?? { uid, points: 0 },
    after: member,
  });

  return Response.json({ ok: true, member });
}
