"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { FacebookAuthProvider, GoogleAuthProvider, linkWithPopup, unlink } from "firebase/auth";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { IconCheck } from "@/components/Icons";
import { deviceLabel, getSid, loadSessions, type AccountSession } from "@/lib/device";

/**
 * Segurança da conta (§8/Doc Mestre 9.5): métodos vinculados, e-mail,
 * lista de dispositivos (registry `users/{uid}/sessions` via API) +
 * encerrar as outras sessões, senha com reautenticação e exclusão.
 * O Firebase não expõe sessões por conta — o registry é da loja.
 */

const providerLabels: Record<string, string> = {
  "google.com": "Google",
  "facebook.com": "Facebook",
  password: "E-mail e senha",
};

/** "agora" / "há 5 min" / "há 2 h" / "ontem" / data por extenso. */
function formatLastSeen(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const diff = Date.now() - time;
  if (diff < 60_000) return "agora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(time).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SecuritySection() {
  const {
    user,
    notify,
    logout,
    changePassword,
    sendReset,
    verifyEmail,
    revokeSessions,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [device] = useState(deviceLabel);
  const [sessions, setSessions] = useState<AccountSession[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // carrega o registry de dispositivos (Etapa C) — null = API indisponível
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void loadSessions().then((list) => {
      if (!alive) return;
      setSessions(list);
      setSessionsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return null;

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
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

  /** Vincula Google/Facebook à conta atual (§8 — mesma Cliffhanger Account). */
  const linkProvider = async (providerId: "google.com" | "facebook.com") => {
    const current = getClientAuth()?.currentUser;
    if (!current) {
      notify("Sessão expirada — entre novamente.", "error");
      return;
    }
    setBusy(true);
    try {
      const provider =
        providerId === "google.com" ? new GoogleAuthProvider() : new FacebookAuthProvider();
      await linkWithPopup(current, provider);
      notify("Método vinculado à sua conta.", "success");
    } catch (error) {
      notify(
        error instanceof Error && "code" in error && (error as { code: string }).code === "auth/credential-already-in-use"
          ? "Este login já pertence a outra conta."
          : "Falha ao vincular — tente novamente.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  /** Desvincula — nunca o último método (evita conta sem acesso). */
  const unlinkProvider = async (providerId: string) => {
    const current = getClientAuth()?.currentUser;
    if (!current) {
      notify("Sessão expirada — entre novamente.", "error");
      return;
    }
    if (user && user.providers.length <= 1) {
      notify("Não dá para remover o único método de acesso.", "error");
      return;
    }
    if (!window.confirm("Desvincular este método de login?")) return;
    setBusy(true);
    try {
      await unlink(current, providerId);
      notify("Método desvinculado.", "success");
    } catch {
      notify("Falha ao desvincular — tente novamente.", "error");
    } finally {
      setBusy(false);
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
                  className="inline-flex items-center gap-1 rounded-full border border-violet/50 bg-violet/10 px-3 py-1 text-xs font-semibold"
                >
                  {providerLabels[providerId] ?? providerId}
                  {user.providers.length > 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void unlinkProvider(providerId)}
                      className="ml-1 text-[var(--text-muted)] hover:text-[#e5484d]"
                      aria-label={`Desvincular ${providerLabels[providerId] ?? providerId}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--text-muted)]">Nenhum método vinculado.</span>
            )}
          </div>
          {(!user.providers.includes("google.com") ||
            !user.providers.includes("facebook.com")) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {!user.providers.includes("google.com") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void linkProvider("google.com")}
                  className="btn btn-ghost px-4 py-2 text-xs"
                >
                  Vincular Google
                </button>
              )}
              {!user.providers.includes("facebook.com") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void linkProvider("facebook.com")}
                  className="btn btn-ghost px-4 py-2 text-xs"
                >
                  Vincular Facebook
                </button>
              )}
            </div>
          )}
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
          {sessionsLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Carregando sessões…</p>
          ) : (
            <ul className="space-y-2">
              {(() => {
                const sid = getSid();
                const known = sessions ?? [];
                const current = known.find((session) => session.sid === sid);
                const others = known.filter((session) => session.sid !== sid);
                return (
                  <>
                    <li className="rounded-xl border border-violet/40 bg-violet/10 px-3 py-2">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span className="inline-block h-2 w-2 rounded-full bg-gold" />
                        {current?.device || device || "Este dispositivo"}
                        <span className="rounded-full border border-gold/60 px-2 py-px text-[10px] font-bold uppercase tracking-wider text-gold">
                          Este dispositivo
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {current?.ip ? `IP ${current.ip} · ` : ""}
                        {formatLastSeen(current?.lastSeen ?? "") || "agora"}
                      </p>
                    </li>
                    {others.map((session) => (
                      <li key={session.sid} className="px-3 py-1">
                        <p className="text-sm">{session.device}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {session.ip ? `IP ${session.ip} · ` : ""}
                          {formatLastSeen(session.lastSeen) || "sem registro"}
                        </p>
                      </li>
                    ))}
                  </>
                );
              })()}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Encerrar as sessões invalida os acessos em todos os dispositivos (inclusive este) —
            o Firebase não permite derrubar um dispositivo só.
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
                placeholder="Senha atual"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <input
                type="password"
                className="field"
                placeholder="Nova senha (mín. 6 caracteres)"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
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

        <p className="text-xs text-[var(--text-muted)]">
          Excluir a conta? Isso mora em{" "}
          <Link href="/conta/configuracoes/privacidade" className="text-gold underline">
            Privacidade
          </Link>
          , com as consequências explicadas.
        </p>
      </div>
    </div>
  );
}
