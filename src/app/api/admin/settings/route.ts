import { writeAudit } from "@/lib/audit";
import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { DEFAULT_SHOP_SETTINGS, normalizeSettings } from "@/lib/shop-settings";
import type { ShopSettings } from "@/lib/types";

/**
 * §12 — Configurações: leitura e gravação de `site/settings` (somente
 * administrador — a matriz §13 não concede `settings.*` a mais ninguém).
 * O limite do frete grátis alimenta a cotação e as barras de progresso;
 * o e-mail, a página de contato; o aviso, o topo da home.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin(request, "settings.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("site").doc("settings").get();
    const settings: ShopSettings = snap.exists
      ? normalizeSettings(snap.data())
      : { ...DEFAULT_SHOP_SETTINGS, updatedAt: "" };
    return Response.json({ settings, defaults: snap.exists ? undefined : true });
  } catch {
    return Response.json({ error: "Falha ao ler as configurações." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const gate = await requireAdmin(request, "settings.edit");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) {
    return Response.json(
      { error: "Firestore não configurado neste ambiente." },
      { status: 503 },
    );
  }

  let body: { settings?: unknown };
  try {
    body = (await request.json()) as { settings?: unknown };
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const input = (body?.settings ?? {}) as Partial<ShopSettings>;
  const free = Number(input.freeShippingFrom);
  if (!Number.isFinite(free) || free < 0 || free > 100000) {
    return Response.json(
      { error: "O limite do frete grátis precisa ser de R$ 0 a R$ 100000." },
      { status: 400 },
    );
  }
  const email = typeof input.supportEmail === "string" ? input.supportEmail.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "E-mail de suporte inválido." }, { status: 400 });
  }
  const announcementText =
    typeof input.announcementText === "string" ? input.announcementText.trim().slice(0, 200) : "";

  const previous = await db.collection("site").doc("settings").get();
  const settings: ShopSettings = {
    freeShippingFrom: Math.round(free),
    supportEmail: email,
    announcementText,
    announcementActive: input.announcementActive === true && announcementText !== "",
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection("site").doc("settings").set(plainDoc(settings));
  } catch {
    return Response.json({ error: "Falha ao gravar as configurações." }, { status: 500 });
  }

  const bits = [
    `frete grátis a partir de R$ ${settings.freeShippingFrom}`,
    `suporte ${settings.supportEmail}`,
    settings.announcementActive ? `aviso “${settings.announcementText}”` : "sem aviso na home",
  ];
  await writeAudit({
    actor: gate.email,
    uid: gate.uid,
    role: gate.role,
    action: previous.exists ? "editar" : "criar",
    module: "Configurações",
    entity: "settings",
    entityId: "site/settings",
    summary: `Atualizou as configurações: ${bits.join(" · ")}`,
    before: previous.exists ? normalizeSettings(previous.data()) : null,
    after: settings,
  });

  return Response.json({ ok: true, settings });
}
