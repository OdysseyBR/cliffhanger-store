import { isGateResponse, requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AuditLogEntry } from "@/lib/types";

/**
 * §13 — Registro/auditoria de alterações administrativas.
 * Leitura da coleção `auditLogs` (mais recentes primeiro), com filtro
 * opcional por módulo aplicado em memória para não exigir índice
 * composto no Firestore.
 */

export async function GET(request: Request) {
  const gate = await requireAdmin(request, "audit.view");
  if (isGateResponse(gate)) return gate;

  const db = getAdminDb();
  if (!db) return Response.json({ entries: [] });

  const url = new URL(request.url);
  const moduleFilter = (url.searchParams.get("module") ?? "").trim().toLowerCase();
  const requested = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 500) : 200;

  try {
    // busca a mais recente + folga, para o filtro de módulo não esvaziar a lista
    const snap = await db
      .collection("auditLogs")
      .orderBy("at", "desc")
      .limit(moduleFilter ? Math.min(limit * 3, 500) : limit)
      .get();

    const entries: AuditLogEntry[] = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AuditLogEntry, "id">) }))
      .filter((entry) => !moduleFilter || entry.module.toLowerCase() === moduleFilter)
      .slice(0, limit);

    return Response.json({ entries });
  } catch {
    return Response.json({ error: "Falha ao ler a auditoria." }, { status: 500 });
  }
}
