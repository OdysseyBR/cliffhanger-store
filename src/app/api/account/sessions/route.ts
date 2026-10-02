import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";

/**
 * Dispositivos e sessões (Doc Mestre 9.5 — visualização de sessões).
 *
 * O client SDK do Firebase não expõe a lista de sessões, então a loja
 * mantém um próprio registry em `users/{uid}/sessions/{sid}`:
 *
 * - `sid` é um id estável por navegador, gerado no cliente (`ch:sid`);
 * - o POST registra/atualiza a sessão com throttle de 5 min (cliente e
 *   servidor) para não gravar leitura a cada visita;
 * - o IP é gravado **mascarado no servidor** (`189.42.*.*`) — só o prefixo
 *   serve para reconhecer a origem, sem guardar o endereço completo;
 * - `DELETE ?sid=` sai só deste dispositivo; `DELETE` (sem sid) revoga os
 *   refresh tokens de TODO o usuário (encerra tudo) e limpa o registry.
 *
 * Escrita/leitura só via Admin SDK — o cliente nunca toca nessa subcoleção.
 */

const SID_RE = /^[A-Za-z0-9-]{8,64}$/;
const THROTTLE_MS = 5 * 60_000;
const MAX_SESSIONS = 20;

/** IP mascarado: IPv4 guarda os 2 primeiros octetos, IPv6 os 2 grupos. */
function maskIp(raw: string | null): string {
  const ip = (raw ?? "").split(",")[0]?.trim() ?? "";
  if (!ip) return "";
  if (ip.includes(":")) {
    const groups = ip.split(":").slice(0, 2).filter(Boolean);
    return groups.length ? `${groups.join(":")}:*` : "";
  }
  const octets = ip.split(".");
  if (octets.length === 4) return `${octets[0]}.${octets[1]}.*.*`;
  return "";
}

function sessionsCol(db: NonNullable<ReturnType<typeof getAdminDb>>, uid: string) {
  return db.collection("users").doc(uid).collection("sessions");
}

async function deleteAllDocs(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  uid: string,
): Promise<number> {
  let removed = 0;
  for (;;) {
    const snap = await sessionsCol(db, uid).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    removed += snap.size;
    if (snap.size < 400) break;
  }
  return removed;
}

/** Lista as sessões do usuário (mais recentes primeiro). */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Sessões indisponíveis neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await sessionsCol(db, user.uid)
      .orderBy("lastSeen", "desc")
      .limit(MAX_SESSIONS)
      .get();
    const sessions = snap.docs.map((doc) => {
      const data = doc.data() as {
        device?: unknown;
        ip?: unknown;
        firstSeen?: unknown;
        lastSeen?: unknown;
      };
      return {
        sid: doc.id,
        device: typeof data.device === "string" ? data.device : "Dispositivo",
        ip: typeof data.ip === "string" ? data.ip : "",
        firstSeen: typeof data.firstSeen === "string" ? data.firstSeen : "",
        lastSeen: typeof data.lastSeen === "string" ? data.lastSeen : "",
      };
    });
    return Response.json({ sessions });
  } catch {
    return Response.json({ error: "Falha ao ler as sessões." }, { status: 500 });
  }
}

/** Registra/atualiza a sessão deste dispositivo (throttle de 5 min). */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Sessões indisponíveis neste ambiente." },
      { status: 503 },
    );
  }

  let body: { sid?: unknown; device?: unknown } = {};
  try {
    body = (await request.json()) as { sid?: unknown; device?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const sid = String(body.sid ?? "").trim();
  if (!SID_RE.test(sid)) {
    return Response.json({ error: "Identificador de sessão inválido." }, { status: 400 });
  }
  const device = String(body.device ?? "").trim().slice(0, 80) || "Dispositivo";

  try {
    const ref = sessionsCol(db, user.uid).doc(sid);
    const existing = await ref.get();
    const previous = existing.exists
      ? (existing.data() as { firstSeen?: unknown; lastSeen?: unknown })
      : null;

    if (previous?.lastSeen) {
      const last = Date.parse(String(previous.lastSeen));
      if (Number.isFinite(last) && Date.now() - last < THROTTLE_MS) {
        return Response.json({ ok: true, throttled: true });
      }
    }

    const now = new Date().toISOString();
    const ip = maskIp(
      request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
    );
    const ua = (request.headers.get("user-agent") ?? "").slice(0, 200);
    const firstSeen =
      previous?.firstSeen && typeof previous.firstSeen === "string"
        ? previous.firstSeen
        : now;

    await ref.set({ device, ua, ip, firstSeen, lastSeen: now });

    // corta as sessões mais antigas para o registry não crescer sem limite
    const all = await sessionsCol(db, user.uid)
      .orderBy("lastSeen", "desc")
      .limit(MAX_SESSIONS + 1)
      .get();
    if (all.size > MAX_SESSIONS) {
      const batch = db.batch();
      for (const doc of all.docs.slice(MAX_SESSIONS)) batch.delete(doc.ref);
      await batch.commit();
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Falha ao registrar a sessão." }, { status: 500 });
  }
}

/**
 * `DELETE ?sid=` — sai só deste dispositivo (apaga o registro local).
 * `DELETE` — revoga os refresh tokens de todo o usuário (9.5 "sair de
 * todos os dispositivos") e limpa o registry inteiro.
 */
export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return Response.json(
      { error: "Encerramento de sessões não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const sid = new URL(request.url).searchParams.get("sid")?.trim() ?? "";

  try {
    if (sid) {
      if (!SID_RE.test(sid)) {
        return Response.json({ error: "Sessão inválida." }, { status: 400 });
      }
      await sessionsCol(db, user.uid).doc(sid).delete();
      return Response.json({ ok: true });
    }

    // checkRevoked=false de propósito: o token de quem está pedindo ainda
    // é válido e precisa passar na verificação (mesmo padrão do revoke).
    await auth.revokeRefreshTokens(user.uid);
    await deleteAllDocs(db, user.uid);
    return Response.json({ ok: true });
  } catch {
    // o token já passou no requireUser — o restante é falha interna
    return Response.json(
      { error: "Não foi possível encerrar as sessões. Tente novamente." },
      { status: 500 },
    );
  }
}
