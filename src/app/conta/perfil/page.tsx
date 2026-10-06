"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";

/**
 * §5 — Perfil: nome de exibição, avatar e telefone do `customers/{uid}`.
 * Dados operacionais (entrega/cobrança) continuam nas seções próprias.
 */

export default function ContaPerfilPage() {
  const { user, notify } = useStore();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || initialized) return;
    const timer = window.setTimeout(() => {
      setName(user.displayName ?? "");
      setPhoto(user.photoURL ?? "");
      setInitialized(true);
      void (async () => {
        try {
          const token = await getClientAuth()?.currentUser?.getIdToken();
          if (!token) return;
          const res = await fetch(`/api/account/profile?uid=${encodeURIComponent(user.uid)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = (await res.json()) as { profile?: { phone?: string; email?: string } };
          if (data.profile?.phone) setPhone(data.profile.phone);
          if (data.profile?.email) setEmail(data.profile.email);
        } catch {
          /* segue com o básico do Auth */
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, initialized]);

  if (!user) return <h1 className="sr-only">Perfil</h1>;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const token = await getClientAuth()?.currentUser?.getIdToken();
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, photo, phone }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        notify(data.error ?? "Falha ao salvar o perfil.", "error");
        return;
      }
      notify("Perfil atualizado.", "success");
      await getClientAuth()?.currentUser?.reload();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h1 className="text-display text-2xl text-gold">Perfil</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Nome, avatar e telefone — sem configurações complexas (§5)
        </p>
      </div>

      <form onSubmit={(event) => void handleSave(event)} className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-bold uppercase tracking-wider">Nome de exibição</span>
          <input
            className="field w-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-bold uppercase tracking-wider">Telefone</span>
          <input
            className="field w-full"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(11) 99999-9999"
          />
        </label>
        <label className="block text-xs sm:col-span-2">
          <span className="mb-1 block font-bold uppercase tracking-wider">
            Avatar (URL https, opcional)
          </span>
          <input
            className="field w-full"
            value={photo}
            onChange={(event) => setPhoto(event.target.value)}
            placeholder="https://…"
          />
        </label>
        <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
          E-mail da conta: <strong>{email || user.email}</strong> (não pode ser alterado por aqui).
        </p>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="btn btn-primary px-4 py-2 text-[11px]">
            {busy ? "Salvando…" : "Salvar perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
