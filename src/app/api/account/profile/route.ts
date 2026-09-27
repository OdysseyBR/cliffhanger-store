import { getAdminAuth, getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";

/**
 * §5 — perfil do usuário: nome de exibição, avatar e telefone.
 * Nome/avatar sobem para o Firebase Auth (valem em todo dispositivo) e
 * para `customers/{uid}` (vitrine do painel e checkout); telefone mora
 * só no perfil da loja. E-mail continua imutável por aqui.
 */

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Telefone e e-mail do `customers/{uid}` para pré-preencher o formulário. */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  if (!db) return Response.json({ profile: null });

  try {
    const snap = await db.collection("customers").doc(user.uid).get();
    if (!snap.exists) return Response.json({ profile: null });
    const data = snap.data() as { phone?: unknown; email?: unknown };
    return Response.json({
      profile: {
        phone: typeof data.phone === "string" ? data.phone : "",
        email: typeof data.email === "string" ? data.email : user.email,
      },
    });
  } catch {
    return Response.json({ profile: null });
  }
}

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return Response.json(
      { error: "Perfil indisponível neste ambiente." },
      { status: 503 },
    );
  }

  let body: { name?: unknown; photo?: unknown; phone?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const name = str(body?.name);
  if (name.length < 2 || name.length > 80) {
    return Response.json({ error: "O nome precisa de 2 a 80 caracteres." }, { status: 400 });
  }

  const photo = str(body?.photo);
  if (photo && !/^https?:\/\//i.test(photo)) {
    return Response.json({ error: "O avatar precisa ser uma URL https válida." }, { status: 400 });
  }

  const phone = str(body?.phone).replace(/[^\d+]/g, "");
  if (phone && (phone.replace(/\D/g, "").length < 8 || phone.replace(/\D/g, "").length > 15)) {
    return Response.json({ error: "Telefone inválido." }, { status: 400 });
  }

  try {
    await auth.updateUser(user.uid, {
      displayName: name,
      photoURL: photo || undefined,
    });
  } catch {
    return Response.json({ error: "Falha ao atualizar o perfil." }, { status: 500 });
  }

  try {
    await db
      .collection("customers")
      .doc(user.uid)
      .set(
        plainDoc({
          id: user.uid,
          name,
          photo: photo || undefined,
          phone: phone || undefined,
          email: user.email,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true },
      );
  } catch {
    /* Auth atualizado; perfil da loja sincroniza no próximo login */
  }

  return Response.json({ ok: true, profile: { name, photo, phone } });
}
