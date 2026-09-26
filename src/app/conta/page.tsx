"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { AuthCard } from "@/components/AuthCard";
import { IconCheck } from "@/components/Icons";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

const providerLabels: Record<string, string> = {
  "google.com": "Google",
  "facebook.com": "Facebook",
  password: "E-mail e senha",
};

/** Rótulo amigável do dispositivo atual (9.5 — visualização de sessões). */
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

export default function ContaPage() {
  const {
    user,
    authLoading,
    logout,
    changePassword,
    sendReset,
    verifyEmail,
    deleteAccount,
    revokeSessions,
    theme,
    setTheme,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [device] = useState(deviceLabel);

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
    <Page>
      <Section title="Minha conta" subtitle="Uma única conta Cliffhanger para loja, biblioteca e clube.">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* estado da sessão */}
          <div className="card p-6">
            {authLoading ? (
              <p className="text-[var(--text-muted)]">Verificando sessão…</p>
            ) : user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-violet text-lg font-extrabold text-white">
                    {(user.displayName ?? user.email ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{user.displayName ?? "Leitor(a)"}</p>
                    <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Link href="/biblioteca" className="btn btn-primary">
                    Minha biblioteca
                  </Link>
                  <Link href="/wishlist" className="btn btn-ghost">
                    Minha wishlist
                  </Link>
                  <Link href="/pedidos" className="btn btn-ghost">
                    Meus pedidos
                  </Link>
                  <Link href="/carrinho" className="btn btn-ghost">
                    Carrinho
                  </Link>
                  <button type="button" onClick={() => void logout()} className="btn btn-ghost">
                    Sair
                  </button>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                    Padrão visual da loja
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "", label: "Padrão Cliffhanger" },
                        { key: "claro", label: "Padrão Cliffhanger Claro" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.key || "padrao"}
                        type="button"
                        onClick={() => setTheme(option.key)}
                        className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                          theme === option.key
                            ? "border-transparent bg-violet text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    “Padrão Cliffhanger” é a identidade oficial da loja; “Padrão Cliffhanger
                    Claro” inverte as áreas escuras para claras. A escolha fica salva neste
                    navegador.
                  </p>
                </div>
              </div>
            ) : (
              <AuthCard />
            )}
          </div>

          {/* benefícios */}
          <div className="card space-y-4 p-6">
            <h2 className="text-display text-3xl">Por que ter conta?</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 self-start text-gold"><IconCheck className="h-4 w-4" /></span> Biblioteca digital sincronizada entre
                dispositivos.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 self-start text-gold"><IconCheck className="h-4 w-4" /></span> Wishlist compartilhável e alertas de reposição.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 self-start text-gold"><IconCheck className="h-4 w-4" /></span> Dados e endereço pré-preenchidos no checkout.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 self-start text-gold"><IconCheck className="h-4 w-4" /></span> Pontos no Cliffhanger Club a cada compra.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 self-start text-gold"><IconCheck className="h-4 w-4" /></span> Acesso antecipado a pré-vendas e edições
                limitadas.
              </li>
            </ul>

            <div className="rounded-xl border border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
              Provedores: <strong className="text-gold">Google</strong>,{" "}
              <strong className="text-gold">Facebook</strong> e{" "}
              <strong className="text-gold">E-mail/senha</strong> — todos pela mesma Cliffhanger
              Account (Firebase Authentication).
            </div>
          </div>

          {/* segurança da conta (9.5) */}
          {user && (
            <div className="card space-y-6 p-6 lg:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-display text-3xl">Segurança da conta</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Verificação, métodos vinculados, sessões, senha e exclusão (Doc Mestre 9.5).
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* coluna esquerda: identidade e sessão */}
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
                        <span className="text-sm text-[var(--text-muted)]">
                          Nenhum método vinculado.
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      Todos apontam para a mesma Cliffhanger Account.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                      E-mail
                    </p>
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
                      <span className="inline-block h-2 w-2 rounded-full bg-gold align-middle" />{" "}
                      Este dispositivo — {device || "…"}
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

                {/* coluna direita: senha e exclusão */}
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                      Alterar senha
                    </p>
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
            </div>
          )}
        </div>
      </Section>
    </Page>
  );
}
