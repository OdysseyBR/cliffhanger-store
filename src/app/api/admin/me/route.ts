import { isGateResponse, requireAdminSession } from "@/lib/admin-guard";
import { ADMIN_ROLE_LABELS, type AdminPermission } from "@/lib/roles";

/**
 * §13 — Papel e permissões da sessão corrente.
 * Devolve o papel resolvido (super admin = administrador) e a matriz de
 * permissões efetiva, para a UI do painel habilitar/desabilitar módulos.
 * Usa `requireAdminSession`: qualquer conta com acesso ao painel precisa
 * conseguir ler o PRÓPRIO papel (inclusive para descobrir o que falta).
 */

export async function GET(request: Request) {
  const gate = await requireAdminSession(request);
  if (isGateResponse(gate)) return gate;

  return Response.json({
    email: gate.email,
    uid: gate.uid,
    role: gate.role,
    roleLabel: ADMIN_ROLE_LABELS[gate.role],
    permissions: gate.permissions as AdminPermission[],
  });
}
