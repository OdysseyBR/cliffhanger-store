import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AdminRole } from "@/lib/roles";

/**
 * §13 — Registro/auditoria de alterações administrativas relevantes.
 *
 * Toda rota de escrita do painel chama `writeAudit()` DEPOIS da mutação
 * bem-sucedida. Grava na coleção `auditLogs` com ator, papel, ação,
 * módulo, entidade e um resumo legível (mais os estados antes/depois
 * quando fizer sentido).
 *
 * Auditoria nunca derruba a operação principal: falhas são engolidas
 * silenciosamente (melhor perder um log do que um pedido/cupom).
 */

export const AUDIT_ACTIONS = [
  "criar",
  "editar",
  "excluir",
  "ativar",
  "desativar",
  "status",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditInput {
  /** E-mail de quem executou a ação (gate do admin-guard). */
  actor: string;
  uid?: string;
  role?: AdminRole;
  action: AuditAction;
  /** Módulo do painel (§12), ex.: "Cupons", "Produtos", "Equipe". */
  module: string;
  /** Entidade afetada, ex.: "coupon", "product", "adminUser". */
  entity: string;
  /** Identificador estável da entidade (id/código/e-mail). */
  entityId: string;
  /** Resumo legível em pt-BR — o que mudou. */
  summary: string;
  /** Estado anterior (opcional) — serializado com limite de tamanho. */
  before?: unknown;
  /** Estado novo (opcional) — serializado com limite de tamanho. */
  after?: unknown;
}

const MAX_SUMMARY = 300;
const MAX_SNAPSHOT = 4000;

function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function snapshot(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_SNAPSHOT) {
      return { truncado: true, bytes: json.length, trecho: `${json.slice(0, 600)}…` };
    }
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

/** Grava o registro de auditoria. Nunca lança exceção. */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const db = getAdminDb();
    if (!db) return;

    await db.collection("auditLogs").add({
      at: new Date().toISOString(),
      actor: input.actor.trim().toLowerCase(),
      uid: input.uid ?? "",
      role: input.role ?? "",
      action: input.action,
      module: input.module,
      entity: input.entity,
      entityId: clamp(input.entityId, 120),
      summary: clamp(input.summary, MAX_SUMMARY),
      before: snapshot(input.before),
      after: snapshot(input.after),
    });
  } catch {
    /* auditoria é best-effort — nunca bloqueia a operação principal */
  }
}
