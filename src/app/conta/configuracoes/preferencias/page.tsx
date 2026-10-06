"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { SelectInput } from "@/components/admin/form-fields";
import { AUDIO_SPEEDS, defaultAccountPrefs, type AccountPrefs } from "@/lib/account-fields";

/**
 * §11 — experiência: aparência (aplica na hora), leitura e áudio
 * (guardados para o leitor/player e recomendações futuras).
 */

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
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; prefs?: AccountPrefs };
  if (!res.ok || data.error) throw new Error(data.error ?? `Erro ${res.status}.`);
  return data;
}

export default function ContaPreferenciasPage() {
  const { user, notify, theme, setTheme } = useStore();
  const [prefs, setPrefs] = useState<AccountPrefs>(defaultAccountPrefs());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await authed("/api/account/preferences/experience");
        if (data.prefs) {
          setPrefs(data.prefs);
          if (data.prefs.appearance !== theme) setTheme(data.prefs.appearance);
        }
      } catch (error) {
        notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <h1 className="sr-only">Preferências</h1>;

  const set = <K extends keyof AccountPrefs>(key: K, value: AccountPrefs[K]) =>
    setPrefs((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setBusy(true);
    try {
      await authed("/api/account/preferences/experience", { method: "PUT", body: JSON.stringify({ prefs }) });
      setTheme(prefs.appearance);
      notify("Preferências salvas.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-display text-2xl text-gold">Preferências</h1>
        <p className="text-xs text-[var(--text-muted)]">
          O jeito de usar a loja — aplicadas onde suportado (§11)
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando preferências…</p>}

      {!loading && (
        <>
          <div className="card space-y-4 p-5">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Aparência (aplica na hora)
              </p>
              <div className="w-64">
                <SelectInput
                  value={prefs.appearance}
                  options={[
                    { value: "", label: "Modo escuro (padrão)" },
                    { value: "claro", label: "Modo claro" },
                  ]}
                  onChange={(v) => set("appearance", v as AccountPrefs["appearance"])}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Tamanho da letra no leitor
              </p>
              <div className="w-64">
                <SelectInput
                  value={prefs.readerFont}
                  options={[
                    { value: "pequeno", label: "Pequena" },
                    { value: "padrao", label: "Padrão" },
                    { value: "grande", label: "Grande" },
                  ]}
                  onChange={(v) => set("readerFont", v as AccountPrefs["readerFont"])}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Velocidade do audiobook
              </p>
              <div className="w-64">
                <SelectInput
                  value={String(prefs.audioSpeed)}
                  options={AUDIO_SPEEDS.map((speed) => ({ value: String(speed), label: `${speed}x` }))}
                  onChange={(v) => set("audioSpeed", Number(v))}
                />
              </div>
            </div>
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
