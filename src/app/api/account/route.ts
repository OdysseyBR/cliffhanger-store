import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { isUserGateResponse, requireUser } from "@/lib/user-guard";

/**
 * DELETE /api/account — exclusão completa da conta (Doc Mestre §10/9.5,
 * LGPD).
 *
 * O client SDK só apagaria o usuário do Auth e deixaria órfãos todos os
 * documentos do Firestore. Aqui, com o Admin SDK (ID token no header):
 *
 * 1. `customers/{uid}` (perfil, endereços, métodos, preferências);
 * 2. `users/{uid}` + subcoleção `sessions` (wishlist, push tokens, sessões);
 * 3. `libraries/{uid}` + subcoleção `progress` (biblioteca e progresso);
 * 4. `subscriptions/{uid}` (Cliffhanger+);
 * 5. `dropClaims` onde uid = uid (resgates de Drops);
 * 6. `adminUsers` do e-mail (impede ressurreição de privilégio);
 * 7. por último `auth.deleteUser(uid)`.
 *
 * Firestore primeiro, Auth por último: se algo falhar no meio, o usuário
 * continua existindo e pode repetir a exclusão (todas as operações são
 * idempotentes). Pedidos, avaliações e notificações ficam — decisão
 * aprovada no plano da Etapa C.
 */
export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (isUserGateResponse(user)) return user;

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return Response.json(
      { error: "Exclusão de conta não configurada neste ambiente." },
      { status: 503 },
    );
  }

  const { uid, email } = user;

  try {
    // 1) perfil e vinculados (endereços/métodos/prefs moram como campos)
    await db.collection("customers").doc(uid).delete();

    // 2) usuário: subcoleção de sessões primeiro (Firestore não cascata)
    await deleteSubcollection(db, `users/${uid}/sessions`);
    await db.collection("users").doc(uid).delete();

    // 3) biblioteca digital + progresso
    await deleteSubcollection(db, `libraries/${uid}/progress`);
    await db.collection("libraries").doc(uid).delete();

    // 4) assinatura Cliffhanger+
    await db.collection("subscriptions").doc(uid).delete();

    // 5) resgates de Drops do usuário
    let guard = 0;
    for (;;) {
      const snap = await db
        .collection("dropClaims")
        .where("uid", "==", uid)
        .limit(400)
        .get();
      if (snap.empty || guard++ > 10) break;
      const batch = db.batch();
      for (const doc of snap.docs) batch.delete(doc.ref);
      await batch.commit();
      if (snap.size < 400) break;
    }

    // 6) vínculo admin — doc id é o e-mail normalizado (admin/users/route)
    if (email) {
      await db.collection("adminUsers").doc(email).delete();
      const admins = await db
        .collection("adminUsers")
        .where("email", "==", email)
        .limit(10)
        .get();
      if (!admins.empty) {
        const batch = db.batch();
        for (const doc of admins.docs) batch.delete(doc.ref);
        await batch.commit();
      }
    }

    // 7) Auth por último — idempotente se a conta já tiver sido apagada
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (code !== "auth/user-not-found") throw error;
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Não foi possível concluir a exclusão. Tente novamente." },
      { status: 500 },
    );
  }
}

/** Apaga todos os documentos de uma subcoleção (lotes de até 400). */
async function deleteSubcollection(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  path: string,
): Promise<void> {
  for (;;) {
    const snap = await db.collection(path).limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    if (snap.size < 400) return;
  }
}
