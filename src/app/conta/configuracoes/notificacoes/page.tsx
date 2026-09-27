"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { NOTIFY_CATEGORIES, defaultNotifyPrefs, type NotifyChannel, type NotifyPrefs } from "@/lib/account-fields";

/**
 * §9 — comunicação por contexto (loja, lançamentos, wishlist, biblioteca,
 * Plus, pedidos) e canal (e-mail, push, aviso interno).
 */

const CHANNELS: Array<{ key: NotifyChannel; label: string }> = [
  { key: "email", label: "E-mail" },
  { key: "push", label: "Push" },
  { key: "inApp", label: "Aviso interno" },
];

async function authed(path: string, init?: RequestInit) {
  const token = await getClientAuth()?.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; prefs?: NotifyPrefs };
  if (!res.ok || data.error) throw new Error(data.error ?? `Erro ${res.status}.`);
  return data;
}

export default function ContaNotificacoesPage() {
  const { user, notify } = useStore();
  const [prefs, setPrefs] = useState<NotifyPrefs>(defaultNotifyPrefs());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await authed("/api/account/preferences/notifications");
        if (data.prefs) setPrefs(data.prefs);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  const toggle = (category: keyof NotifyPrefs, channel: NotifyChannel) =>
    setPrefs((prev) => ({ ...prev, [category]: { ...prev[category], [channel]: !prev[category][channel] } }));

  const handleSave = async () => {
    setBusy(true);
    try {
      await authed("/api/account/preferences/notifications", { method: "PUT", body: JSON.stringify({ prefs }) });
      notify("Preferências de comunicação salvas.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-display text-2xl text-gold">Notificações</p>
        <p className="text-xs text-[var(--text-muted)]">
          Escolha o que a loja pode te avisar — por contexto e canal (§9)
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando preferências…</p>}

      {!loading && (
        <>
          <div className="card divide-y divide-[var(--border)]/60 p-0">
            {NOTIFY_CATEGORIES.map((category) => (
              <div key={category.key} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{category.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{category.hint}</p>
                </div>
                <div className="flex gap-4">
                  {CHANNELS.map((channel) => (
                    <label key={channel.key} className="flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={prefs[category.key][channel.key]}
                        onChange={() => toggle(category.key, channel.key)}
                      />
                      {channel.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {busy ? "Salvando…" : "Salvar preferências"}
          </button>
        </>
      )}
    </div>
  );
}
