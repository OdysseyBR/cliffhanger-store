"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";

/**
 * SISTEMA → Integrações (Etapa T) — status de leitura das integrações
 * externas por PRESENÇA de configuração (nunca o valor da chave, §13) e
 * a saúde do auto-update do app a partir do manifesto público. Tudo
 * chega da rota protegida `/api/admin/integracoes`; acesso:
 * `settings.view`.
 */

interface Estado {
  ok: boolean;
  label: string;
}

interface Manifesto {
  version: string | null;
  versionCode: number | null;
  releasedAt: string | null;
  apkUrl: string | null;
}

interface Status {
  pagbank: { token: boolean; publicKey: boolean; sandbox: boolean };
  firebase: { client: boolean; admin: boolean };
  cloudinary: { cloud: boolean; preset: boolean };
  facebook: boolean;
  site: { url: boolean; superAdmin: boolean };
  autoUpdate: Manifesto | null;
}

function Chip({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
        ok
          ? "border-gold/50 bg-gold/10 text-gold"
          : "border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      {label ?? (ok ? "Configurado" : "Ausente")}
    </span>
  );
}

function Item({ nome, estado }: { nome: string; estado: Estado }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]/60 py-2 last:border-0">
      <span className="text-xs">{nome}</span>
      <Chip ok={estado.ok} label={estado.label} />
    </div>
  );
}

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default function AdminIntegracoesPage() {
  const { user } = useStore();
  const { me, can, loading } = useAdminPermissions();
  const [dados, setDados] = useState<Status | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      try {
        const resp = await fetch("/api/admin/integracoes");
        const json = (await resp.json()) as Partial<Status> & { error?: string };
        if (!vivo) return;
        if (!resp.ok) {
          setErro(json.error ?? "Não foi possível carregar as integrações.");
        } else {
          setDados(json as Status);
        }
      } catch {
        if (vivo) setErro("Falha de rede ao carregar as integrações.");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [user]);

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para ver as integrações." />;
  }

  const allowed = loading || me?.role === "administrador" || can("settings.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">settings.view</code> — Integrações fica com quem
          configura o ambiente (§13).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-display text-3xl text-gold">Integrações</p>
        <p className="text-xs text-[var(--text-muted)]">
          Status de leitura — só a PRESENÇA da configuração é exibida, nunca o valor da
          chave (§13).
        </p>
      </div>

      {erro && (
        <div className="card p-4 text-sm text-[#e5484d]">{erro}</div>
      )}

      {!dados && !erro && (
        <div className="card p-4 text-sm text-[var(--text-muted)]">Carregando status…</div>
      )}

      {dados && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
              PagBank — pagamentos
            </p>
            <div className="mt-2">
              <Item nome="Token da API" estado={{ ok: dados.pagbank.token, label: "" }} />
              <Item
                nome="Chave pública"
                estado={{ ok: dados.pagbank.publicKey, label: "" }}
              />
              <Item
                nome="Modo"
                estado={{
                  ok: true,
                  label: dados.pagbank.sandbox ? "Sandbox" : "Produção",
                }}
              />
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
              Firebase — contas e banco
            </p>
            <div className="mt-2">
              <Item nome="SDK web (login)" estado={{ ok: dados.firebase.client, label: "" }} />
              <Item
                nome="Admin (Firestore)"
                estado={{ ok: dados.firebase.admin, label: "" }}
              />
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
              Cloudinary — imagens
            </p>
            <div className="mt-2">
              <Item nome="Cloud name" estado={{ ok: dados.cloudinary.cloud, label: "" }} />
              <Item
                nome="Upload preset"
                estado={{ ok: dados.cloudinary.preset, label: "" }}
              />
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
              Site e sessão
            </p>
            <div className="mt-2">
              <Item
                nome="URL pública"
                estado={{ ok: dados.site.url, label: dados.site.url ? "Definida" : "" }}
              />
              <Item
                nome="Super admin"
                estado={{ ok: dados.site.superAdmin, label: "" }}
              />
              <Item
                nome="Facebook Login"
                estado={{ ok: dados.facebook, label: "" }}
              />
            </div>
          </div>

          <div className="card p-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                Auto-update do aplicativo — manifesto público
              </p>
              <Chip
                ok={Boolean(dados.autoUpdate)}
                label={dados.autoUpdate ? "Manifesto no ar" : "Manifesto ausente"}
              />
            </div>
            {dados.autoUpdate ? (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  Versão <strong>{dados.autoUpdate.version ?? "—"}</strong> · versionCode{" "}
                  <strong>{dados.autoUpdate.versionCode ?? "—"}</strong>
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Publicado em{" "}
                  {dados.autoUpdate.releasedAt ? when(dados.autoUpdate.releasedAt) : "—"}
                </p>
                {dados.autoUpdate.apkUrl && (
                  <a
                    href={dados.autoUpdate.apkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-bold text-gold underline"
                  >
                    APK da versão atual ↗
                  </a>
                )}
                <p className="text-[11px] text-[var(--text-muted)]">
                  O app (Android) compara esta versão com a instalada e baixa a atualização —
                  também monitorada em RELATÓRIOS → Integração.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Sem manifesto em <code className="font-mono">/app-version.json</code> — o
                auto-update do app não encontra versão nova.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
