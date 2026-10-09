import { ADMIN_ROLES, ADMIN_ROLE_LABELS, PERMISSION_GROUPS, can } from "@/lib/roles";

/**
 * Matriz de permissões por papel (§13) — somente leitura, extraída da
 * Equipe na Etapa T para compartilhar com SISTEMA → Permissões. Os
 * papéis são definidos em `roles.ts`; editar a matriz exigiria backend
 * novo, então o painel apenas exibe quem lê/edita cada módulo.
 */

function CheckIcon({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={title}
      className="mx-auto h-4 w-4 text-gold"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}

/** Somente leitura — mesmo ícone em contorno (monocromático, currentColor). */
function ViewIcon({ title }: { title: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={title}
      className="mx-auto h-4 w-4 text-gold opacity-60"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}

export function PermissionsMatrix() {
  return (
    <div className="card overflow-x-auto p-5">
      <p className="text-display mb-1 text-xl">Matriz de permissões por papel</p>
      <p className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
        <CheckIcon title="Leitura e edição" />
        <span>leitura e edição</span>
        <ViewIcon title="Somente leitura" />
        <span>somente leitura</span>
        <span>— sem acesso</span>
      </p>
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="py-2 pr-3 font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Módulo
            </th>
            {ADMIN_ROLES.map((role) => (
              <th
                key={role}
                className="px-1 py-2 text-center font-bold uppercase tracking-wider text-[var(--text-muted)]"
              >
                {ADMIN_ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.map((group) => (
            <tr key={group.key} className="border-b border-[var(--border)]/60">
              <td className="py-2 pr-3">
                <span className="font-bold">{group.label}</span>
                <span className="block text-[11px] text-[var(--text-muted)]">
                  {group.modules}
                </span>
              </td>
              {ADMIN_ROLES.map((role) => {
                const edit = group.edit ? can(role, group.edit) : false;
                const view = can(role, group.view);
                return (
                  <td key={role} className="px-1 py-2 text-center">
                    {edit ? (
                      <CheckIcon title="Leitura e edição" />
                    ) : view ? (
                      <ViewIcon title="Somente leitura" />
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
