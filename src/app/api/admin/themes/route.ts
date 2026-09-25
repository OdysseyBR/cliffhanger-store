import { getAdminDb, plainDoc } from "@/lib/firebase-admin";
import { isGateResponse as isResponse, requireAdmin } from "@/lib/admin-guard";
import { normalizeTheme, readThemesFromDb } from "@/lib/themes";
import { THEME_SCHEMA_VERSION } from "@/lib/theme-css";import type { ThemeModel } from "@/lib/types";

/**
 * API do Theme Engine (Fase 2) — protegida por ID token do Firebase
 * verificado no servidor + super admin único em SUPER_ADMIN_EMAIL
 * (painel — seção 11). Somente UM e-mail pode ser configurado; sem
 * variável (ou com valor que não seja um único e-mail), NINGUÉM entra.
 *
 * GET  /api/admin/themes                          → lista modelos (schema 2)
 * POST { action: "save", theme }                  → cria/atualiza (CMS)
 * POST { action: "duplicate", sourceId, name? }   → duplicação (4.7)
 * POST { action: "delete", id }                   → apaga apenas rascunhos
 */

function sanitizeTheme(input: ThemeModel): ThemeModel | null {
  if (!input || typeof input !== "object") return null;
  if (!input.id || !input.key || !input.name) return null;
  if (!input.identity?.colors || !input.home?.banner?.title) return null;
  if (!Array.isArray(input.home.sections)) return null;

  const now = new Date().toISOString();
  return {
    ...input,
    key: String(input.key).trim().toLowerCase(),
    status: ["rascunho", "preview", "publicado", "arquivado"].includes(input.status)
      ? input.status
      : "rascunho",
    schemaVersion: THEME_SCHEMA_VERSION,
    createdAt: input.createdAt || now,
    updatedAt: now,
    home: {
      ...input.home,
      destaques: Array.isArray(input.home.destaques) ? input.home.destaques : [],
      sections: input.home.sections,
      zones: Array.isArray(input.home.zones) ? input.home.zones : [],
    },
  };
}

export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (isResponse(gate)) return gate;

  try {
    const themes = await readThemesFromDb(getAdminDb()!);
    return Response.json({ ok: true, themes, email: gate.email });
  } catch {
    return Response.json({ error: "Falha ao ler modelos do Firestore." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin(request);
  if (isResponse(gate)) return gate;

  const db = getAdminDb()!;
  let body: {
    action?: "save" | "duplicate" | "delete";
    theme?: ThemeModel;
    sourceId?: string;
    id?: string;
    name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  try {
    if (body.action === "save") {
      const sanitized = sanitizeTheme(body.theme as ThemeModel);
      if (!sanitized) {
        return Response.json(
          { error: "Modelo inválido (id, key, nome e banner são obrigatórios)." },
          { status: 400 },
        );
      }
      const theme = normalizeTheme(sanitized);

      const existing = await readThemesFromDb(db);
      const keyTaken = existing.find((t) => t.key === theme.key && t.id !== theme.id);
      if (keyTaken) {
        return Response.json(
          { error: `A chave "${theme.key}" já está em uso por "${keyTaken.name}".` },
          { status: 409 },
        );
      }

      await db.collection("themes").doc(theme.id).set(plainDoc(theme), { merge: false });
      return Response.json({ ok: true, theme });
    }

    if (body.action === "duplicate") {
      const all = await readThemesFromDb(db);
      const source = all.find((t) => t.id === body.sourceId);
      if (!source) {
        return Response.json({ error: "Modelo de origem não encontrado." }, { status: 404 });
      }

      const suffix = Date.now().toString(36).slice(-4);
      const now = new Date().toISOString();
      const copy: ThemeModel = {
        ...source,
        id: `theme-${suffix}-${source.key}`.slice(0, 60),
        key: `${source.key}-copia-${suffix}`,
        name: body.name?.trim() || `${source.name} (cópia)`,
        status: "rascunho",
        version: "v1.0",
        parentOf: source.id,
        scheduledStart: null,
        scheduledEnd: null,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection("themes").doc(copy.id).set(plainDoc(copy));
      return Response.json({ ok: true, theme: copy });
    }

    if (body.action === "delete") {
      const target = (await readThemesFromDb(db)).find((t) => t.id === body.id);
      if (!target) return Response.json({ ok: true, note: "nada a apagar" });

      if (target.status !== "rascunho") {
        return Response.json(
          { error: "Apenas rascunhos podem ser apagados — para publicados, use Arquivar." },
          { status: 409 },
        );
      }
      await db.collection("themes").doc(target.id).delete();
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (error) {
    console.warn("[admin/themes] falha:", error);
    return Response.json({ error: "Falha ao gravar no Firestore." }, { status: 500 });
  }
}
