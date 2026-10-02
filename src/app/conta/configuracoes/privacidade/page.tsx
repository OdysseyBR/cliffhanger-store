"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";

/**
 * §10 — privacidade: o que a conta usa, marketing, exportação e exclusão.
 * Excluir remove perfil e vinculados e mantém pedidos (decisão aprovada).
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
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok || data.error) throw new Error(typeof data.error === "string" ? data.error : `Erro ${res.status}.`);
  return data;
}

export default function ContaPrivacidadePage() {
  const router = useRouter();
  const { user, notify, authError, deleteAccount } = useStore();
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await authed("/api/account/preferences/privacy");
        if (typeof data.marketingConsent === "boolean") setConsent(data.marketingConsent);
      } catch {
        /* padrão: consentido */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  const handleConsent = async (value: boolean) => {
    setConsent(value);
    try {
      await authed("/api/account/preferences/privacy", {
        method: "PUT",
        body: JSON.stringify({ marketingConsent: value }),
      });
      notify("Preferência de marketing salva.", "success");
    } catch (error) {
      setConsent(!value);
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getClientAuth()?.currentUser?.getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [profile, orders, library] = await Promise.all([
        fetch("/api/account/profile", { headers }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/orders/mine", { headers }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/library", { headers }).then((r) => r.json()).catch(() => ({})),
      ]);
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), profile, orders, library }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cliffhanger-meus-dados.json";
      link.click();
      URL.revokeObjectURL(url);
      notify("Dados exportados.", "success");
    } catch {
      notify("Falha ao exportar.", "error");
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    let success = false;
    try {
      // reautenticação obrigatória: senha atual (contas com senha) ou
      // popup do Google/Facebook — feita dentro de deleteAccount (Etapa C)
      await deleteAccount(user.providers.includes("password") ? deletePassword : undefined);
      success = true;
    } catch {
      /* erro já exibido pelo provider (toast + authError no painel) */
    } finally {
      setBusy(false);
    }
    if (success) {
      setConfirming(false);
      setDeletePassword("");
      router.replace("/");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-display text-2xl text-gold">Privacidade</p>
        <p className="text-xs text-[var(--text-muted)]">
          Seus dados, suas regras (§10)
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando…</p>}

      {!loading && (
        <>
          <div className="card space-y-2 p-5">
            <p className="text-sm font-bold">O que a conta usa</p>
            <p className="text-xs text-[var(--text-muted)]">
              Perfil (nome, avatar, telefone), endereços, métodos de pagamento (só
              referências), biblioteca digital, assinatura Cliffhanger+, wishlist,
              pedidos, avaliações e pontos do clube — tudo visível nas seções desta
              conta.
            </p>
          </div>

          <div className="card flex flex-wrap items-center gap-3 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Comunicações de marketing</p>
              <p className="text-xs text-[var(--text-muted)]">
                Ofertas e novidades por e-mail. Dá para mudar quando quiser.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => void handleConsent(event.target.checked)}
              />
              Receber
            </label>
          </div>

          <div className="card flex flex-wrap items-center gap-3 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Exportar meus dados</p>
              <p className="text-xs text-[var(--text-muted)]">
                Baixa perfil, pedidos e biblioteca em JSON.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              {exporting ? "Gerando…" : "Exportar"}
            </button>
          </div>

          <div className="rounded-xl border border-[#e5484d]/40 p-5">
            <p className="text-sm font-bold text-[#e5484d]">Excluir conta</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Remove perfil, endereços, métodos, biblioteca vinculada, wishlist e a
              assinatura Cliffhanger+ (benefícios temporários e Drops encerram junto
              com a conta; itens permanentes já resgatados saem da biblioteca). Os
              pedidos já feitos são mantidos sem dono para fins fiscais e de histórico.
            </p>
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy}
                className="mt-3 btn btn-ghost border-[#e5484d]/40 px-4 py-2 text-xs text-[#e5484d]"
              >
                Excluir conta
              </button>
            ) : (
              <div className="mt-3 space-y-2 rounded-xl border border-[#e5484d]/50 bg-[#e5484d]/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#e5484d]">
                  Confirmar exclusão permanente
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Esta ação não pode ser desfeita.{" "}
                  {user.providers.includes("password")
                    ? "Digite sua senha atual para confirmar sua identidade."
                    : "Você será solicitado a confirmar sua identidade pelo Google/Facebook."}
                </p>
                {user.providers.includes("password") && (
                  <input
                    type="password"
                    className="field"
                    placeholder="Senha atual"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    autoComplete="current-password"
                  />
                )}
                {authError && (
                  <p className="text-xs font-semibold text-[#e5484d]">{authError}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void confirmDelete()}
                    disabled={
                      busy ||
                      (user.providers.includes("password") && deletePassword.length === 0)
                    }
                    className="btn btn-ghost border-[#e5484d] bg-[#e5484d] px-4 py-2 text-xs text-[#F8FEFF]"
                  >
                    {busy ? "Excluindo…" : "Sim, excluir minha conta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(false);
                      setDeletePassword("");
                    }}
                    disabled={busy}
                    className="btn btn-ghost px-4 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
