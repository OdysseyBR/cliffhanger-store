"use client";

import { useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { IconGoogleG } from "@/components/Icons";

/** Tela de entrada do /admin — super admin único via SUPER_ADMIN_EMAIL. */
export function AdminLogin({ note }: { note?: string }) {
  const { authLoading, user, firebaseReady, signInGoogle, signInEmail } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(() => signInEmail(email, password));
  };

  return (
    <div className="card mx-auto max-w-md gap-4 p-8">
      <p className="text-display text-3xl text-gold">Painel Cliffhanger</p>
      <p className="text-sm text-[var(--text-muted)]">
        Acesso restrito ao super admin autorizado (variável <code>SUPER_ADMIN_EMAIL</code>).
      </p>

      {note && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs">{note}</p>
      )}
      {error && (
        <p className="rounded-lg bg-[#e5484d]/15 px-3 py-2 text-xs text-[#e5484d]">{error}</p>
      )}

      {!firebaseReady ? (
        <p className="text-sm text-[var(--text-muted)]">
          Firebase não configurado neste ambiente — admin indisponível.
        </p>
      ) : authLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Verificando sessão…</p>
      ) : user ? (
        <p className="text-sm text-[var(--text-muted)]">
          Sessão de {user.email} validada — carregando…
        </p>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void run(signInGoogle)}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            <IconGoogleG className="h-4 w-4" />
            Continuar com Google
          </button>
          <form onSubmit={submit} className="space-y-3">
            <input
              className="field"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="field"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="submit" disabled={busy} className="btn btn-ghost w-full">
              {busy ? "Entrando…" : "Entrar com e-mail e senha"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
