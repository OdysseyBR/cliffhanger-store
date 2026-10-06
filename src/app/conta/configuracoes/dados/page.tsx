"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";

/**
 * §5 (detalhe) — dados pessoais estendidos: sobrenome e documento para
 * as operações comerciais. O básico (nome, avatar, telefone) continua em
 * Perfil.
 */

export default function ContaDadosPage() {
  const { user, notify } = useStore();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [doc, setDoc] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const token = await getClientAuth()?.currentUser?.getIdToken();
        const res = await fetch("/api/account/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = (await res.json()) as {
            profile?: { surname?: string; doc?: string; phone?: string };
          };
          setSurname(data.profile?.surname ?? "");
          setDoc(data.profile?.doc ?? "");
          setPhone(data.profile?.phone ?? "");
        }
        setName(user.displayName ?? "");
      } catch {
        /* segue vazio */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return <h1 className="sr-only">Dados pessoais</h1>;

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
        body: JSON.stringify({ name: name || user.displayName || "Leitor", surname, doc, phone }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        notify(data.error ?? "Falha ao salvar.", "error");
        return;
      }
      notify("Dados salvos.", "success");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h1 className="text-display text-2xl text-gold">Dados pessoais</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Para as operações da loja — o básico fica em Perfil
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
      ) : (
        <form onSubmit={(event) => void handleSave(event)} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider">Sobrenome</span>
            <input className="field w-full" value={surname} onChange={(event) => setSurname(event.target.value)} maxLength={80} />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider">CPF/CNPJ (só números)</span>
            <input className="field w-full" value={doc} onChange={(event) => setDoc(event.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="Usado na nota e na entrega" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider">Telefone</span>
            <input className="field w-full" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn btn-primary px-4 py-2 text-[11px]">
              {busy ? "Salvando…" : "Salvar dados"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
