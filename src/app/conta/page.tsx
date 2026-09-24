"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useStore } from "@/components/Providers";
import { IconCheck, IconFacebookF, IconGoogleG } from "@/components/Icons";
import { Page } from "@/components/Page";
import { Section } from "@/components/Section";

type Mode = "entrar" | "criar";

export default function ContaPage() {
  const {
    user,
    authLoading,
    authError,
    firebaseReady,
    signInGoogle,
    signInFacebook,
    signInEmail,
    registerEmail,
    logout,
    theme,
    setTheme,
  } = useStore();

  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") await signInEmail(email, password);
      else await registerEmail(email, password);
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

  const facebookConfigured = Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);

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
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-violet text-lg font-extrabold text-paper">
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
                  <Link href="/carrinho" className="btn btn-ghost">
                    Carrinho
                  </Link>
                  <button type="button" onClick={() => void logout()} className="btn btn-ghost">
                    Sair
                  </button>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                    Tema da loja (Theme Engine)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "", label: "Automático" },
                        { key: "winter-fest", label: "Winter Fest" },
                        { key: "summer-fest", label: "Summer Fest" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.key || "auto"}
                        type="button"
                        onClick={() => setTheme(option.key)}
                        className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                          theme === option.key
                            ? "border-transparent bg-violet text-paper"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    “Automático” segue o modelo publicado no painel /admin (pode mudar por
                    agendamento).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex gap-2">
                  {(["entrar", "criar"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                        mode === m ? "bg-violet text-paper" : "border border-[var(--border)]"
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
                </form>
              </div>
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
        </div>
      </Section>
    </Page>
  );
}
