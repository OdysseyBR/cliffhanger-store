"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { IconFacebookF, IconGoogleG } from "@/components/Icons";

type Mode = "entrar" | "criar" | "recuperar";

/**
 * Card de autenticação compartilhado por `/conta`, `/login`, `/cadastro` e
 * `/recuperacao-de-senha` (Documento de Correção §22 — rotas obrigatórias).
 * Login social, e-mail/senha e recuperação de senha pela mesma conta.
 */
export function AuthCard({ initialMode = "entrar" }: { initialMode?: Mode }) {
  const {
    user,
    authLoading,
    authError,
    firebaseReady,
    signInGoogle,
    signInFacebook,
    signInEmail,
    registerEmail,
    sendReset,
  } = useStore();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") await signInEmail(email, password);
      else if (mode === "criar") await registerEmail(email, password);
      else {
        await sendReset(email);
        setSent(true);
      }
    } catch {
      /* erro já exibido pelo provider */
    } finally {
      setBusy(false);
    }
  };

  const facebookConfigured = Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);

  if (authLoading) {
    return <p className="text-[var(--text-muted)]">Verificando sessão…</p>;
  }

  // Sessão ativa (em /login e /cadastro): aproveita e navega para a conta.
  if (user) {
    return (
      <div className="space-y-4">
        <p className="text-sm">
          Você já está conectado como{" "}
          <strong className="text-gold">{user.displayName ?? user.email}</strong>.
        </p>
        <div className="grid gap-2">
          <Link href="/conta" className="btn btn-primary">
            Minha conta
          </Link>
          <Link href="/pedidos" className="btn btn-ghost">
            Meus pedidos
          </Link>
          <Link href="/biblioteca" className="btn btn-ghost">
            Minha biblioteca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["entrar", "criar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setSent(false);
              setMode(m);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              mode === m ? "bg-violet text-white" : "border border-[var(--border)]"
            }`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      {!firebaseReady && (
        <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          Firebase não configurado: copie <code>.env.example</code> para{" "}
          <code>.env.local</code> e preencha as chaves para habilitar o login.
        </p>
      )}

      {authError && (
        <p className="rounded-xl bg-[#e5484d]/15 px-4 py-3 text-sm text-[#e5484d]">
          {authError}
        </p>
      )}

      {mode === "recuperar" ? (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            Informe o e-mail da sua conta Cliffhanger e enviaremos um link para
            criar uma nova senha.
          </p>
          <input
            type="email"
            className="field"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy || !firebaseReady}
          >
            {busy ? "Aguarde…" : "Enviar link de recuperação"}
          </button>
          {sent && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
              Se o e-mail existir, o link chega em instantes. Confira também a
              caixa de spam.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setMode("entrar");
            }}
            className="block w-full text-center text-xs font-semibold text-gold transition hover:underline"
          >
            Lembrei minha senha — voltar para o login
          </button>
        </form>
      ) : (
        <>
          <div className="grid gap-3">
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={busy || !firebaseReady}
              onClick={() => void run(signInGoogle)}
            >
              <IconGoogleG className="h-4 w-4" />
              Continuar com Google
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={busy || !firebaseReady || !facebookConfigured}
              onClick={() => void run(signInFacebook)}
              title={
                facebookConfigured
                  ? "Entrar com Facebook"
                  : "Defina NEXT_PUBLIC_FACEBOOK_APP_ID para habilitar"
              }
            >
              <IconFacebookF className="h-4 w-4" />
              {facebookConfigured ? "Continuar com Facebook" : "Facebook (não configurado)"}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            ou com e-mail
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              className="field"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="field"
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy || !firebaseReady}
            >
              {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
            </button>
            {mode === "entrar" && (
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setMode("recuperar");
                }}
                className="block w-full text-center text-xs font-semibold text-gold transition hover:underline"
              >
                Esqueci minha senha
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}
