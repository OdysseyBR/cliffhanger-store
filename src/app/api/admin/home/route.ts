import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { sanitizeHomeInput } from "@/lib/content-fields";
import type { HomeOverride, ThemeHomeSection } from "@/lib/types";

/**
 * §12/§3 — Home: leitura da curadoria e gravação (`site/home`).
 * Destaques precisam existir em `products`; seções precisam ser chaves
 * da arquitetura (§3.6). A página aplica a curadoria sobre o padrão
 * ativo e revalida em 5 min (mais a purga aqui).
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "home.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("site").doc("home").get();
    const override = (
      snap.exists ? (snap.data() as Partial<HomeOverride>) : null
    ) as HomeOverride | null;
    return Response.json({ override });
  } catch {
    return Response.json({ error: "Falha ao ler a curadoria da home." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const gate = await requireAdmin(request, "home.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { input?: unknown };
  try {
    body = (await request.json()) as { input?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = sanitizeHomeInput(body?.input);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const form = parsed.item;

  if (form.destaques.length > 0) {
    const snap = await db.collection("products").get();
    const ids = new Set(snap.docs.map((doc) => doc.id));
    const missing = form.destaques.filter((id) => !ids.has(id));
    if (missing.length > 0) {
      return Response.json(
        { error: `Destaque(s) fora do catálogo: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }
  }

  const override: HomeOverride = {
    destaques: form.destaques,
    sections: form.sections as ThemeHomeSection[],
    updatedAt: new Date().toISOString(),
  };

  const previous = await db.collection("site").doc("home").get();
  const hadOverride = previous.exists;

  try {
    await db.collection("site").doc("home").set(plainDoc(override));
  } catch {
    return Response.json({ error: "Falha ao gravar a curadoria da home." }, { status: 500 });
  }

  revalidatePath("/", "layout");

  const describe = (value: HomeOverride): string =>
    value.destaques.length === 0 && value.sections.length === 0
      ? "curadoria limpa (automático do tema)"
      : `${value.destaques.length} destaque(s), ${value.sections.filter((s) => s.enabled).length}/${value.sections.length} seção(ões) ativa(s)`;

  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: hadOverride ? "editar" : "criar",
    module: "Home",
    entity: "home",
    entityId: "site/home",
    summary: `Atualizou a curadoria da home: ${describe(override)}`,
    before: hadOverride ? (previous.data() as Partial<HomeOverride>) : null,
    after: override,
  });

  return Response.json({ ok: true, override });
}
