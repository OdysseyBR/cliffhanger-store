"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { IconCheck } from "@/components/Icons";

/**
 * Segurança da conta (§8/Doc Mestre 9.5): métodos vinculados, e-mail,
 * esta sessão + encerrar as outras, senha e exclusão. O Firebase não
 * lista dispositivos — por isso há "esta sessão" (detectada no
 * navegador) e o encerramento remoto via `/api/account/revoke`.
 */

const providerLabels: Record<string, string> = {
  "google.com": "Google",
  "facebook.com": "Facebook",
  password: "E-mail e senha",
};

/** Rótulo amigável do dispositivo atual (navegador + SO). */
function deviceLabel(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "outro sistema";
  return `${browser} em ${os}`;
}

export function SecuritySection() {
  const {
    user,
    logout,
    changePassword,
    sendReset,
    verifyEmail,
    deleteAccount,
    revokeSessions,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [device] = useState(deviceLabel);

  if (!user) return null;

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await changePassword(newPassword);
      setNewPassword("");
    } catch {
      /* erro já exibido pelo provider */
    } finally {
      setBusy(false);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch {
      /* erro já exibido pelo provider */
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (
      window.confirm(
        "Excluir sua conta Cliffhanger? Perfil, wishlist e biblioteca vinculada serão removidos. Esta ação não pode ser desfeita.",
      )
    ) {
      await run(deleteAccount);
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
            Métodos vinculados
          </p>
          <div className="flex flex-wrap gap-2">
            {user.providers.length > 0 ? (
              user.providers.map((providerId) => (
                <span
                  key={providerId}
                  className="rounded-full border border-violet/50 bg-violet/10 px-3 py-1 text-xs font-semibold"
                >
                  {providerLabels[providerId] ?? providerId}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--text-muted)]">Nenhum método vinculado.</span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Todos apontam para a mesma Cliffhanger Account.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">E-mail</p>
          <p className="text-sm">{user.email}</p>
          {user.emailVerified ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
              <IconCheck className="h-3.5 w-3.5" />
              E-mail verificado
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void run(verifyEmail)}
              disabled={busy}
              className="mt-2 btn btn-ghost px-4 py-2 text-xs"
            >
              Verificar e-mail agora
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
            Dispositivos e sessões
          </p>
          <p className="text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-gold align-middle" /> Este
            dispositivo — {device || "…"}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Encerrar as sessões invalida os acessos em todos os outros dispositivos.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void run(revokeSessions)}
              disabled={busy}
              className="btn btn-ghost px-4 py-2 text-xs"
            >
              Sair de todos os dispositivos
            </button>
            <button
              type="button"
              onClick={() => void run(logout)}
              disabled={busy}
              className="btn btn-ghost px-4 py-2 text-xs"
            >
              Sair (esta sessão)
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Alterar senha</p>
          {user.providers.includes("password") ? (
            <form onSubmit={submitPassword} className="space-y-2">
              <input
                type="password"
                className="field"
                placeholder="Nova senha (mín. 6 caracteres)"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                required
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="btn btn-primary px-4 py-2 text-xs"
                >
                  {busy ? "Aguarde…" : "Alterar senha"}
                </button>
                {user.email && (
                  <button
                    type="button"
                    onClick={() => void run(() => sendReset(user.email ?? ""))}
                    disabled={busy}
                    className="btn btn-ghost px-4 py-2 text-xs"
                  >
                    Link de recuperação
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Esta conta não usa senha — entre pelos métodos vinculados acima.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[#e5484d]/40 p-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#e5484d]">
            Exclusão de conta
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Remove perfil, wishlist e dados vinculados. Não afeta pedidos já feitos.
          </p>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={busy}
            className="mt-3 btn btn-ghost border-[#e5484d]/40 px-4 py-2 text-xs text-[#e5484d]"
          >
            Excluir conta
          </button>
        </div>
      </div>
    </div>
  );
}
