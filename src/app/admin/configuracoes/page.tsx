"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminSettings } from "@/components/admin/useAdminData";
import { Card, Field, NumberInput, TextArea, TextInput } from "@/components/admin/form-fields";
import { formatPrice } from "@/lib/format";
import type { ShopSettings } from "@/lib/types";

/**
 * §12 — Configurações: definições da loja (`site/settings`, somente
 * administrador). O limite do frete grátis alimenta a cotação e as
 * barras de progresso; o e-mail, a página de contato; o aviso, o topo
 * da home — tudo com efeito real na vitrine.
 */

export default function AdminSettingsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const settings = useAdminSettings();

  const [freeShippingFrom, setFreeShippingFrom] = useState(199);
  const [supportEmail, setSupportEmail] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings.settings && !initialized) {
      const timer = window.setTimeout(() => {
        const current = settings.settings;
        if (!current) return;
        setFreeShippingFrom(current.freeShippingFrom);
        setSupportEmail(current.supportEmail);
        setAnnouncementText(current.announcementText);
        setAnnouncementActive(current.announcementActive);
        setInitialized(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [settings.settings, initialized]);

  const handleSave = async () => {
    if (!Number.isFinite(freeShippingFrom) || freeShippingFrom < 0 || freeShippingFrom > 100000) {
      notify("O limite do frete grátis precisa ser de R$ 0 a R$ 100000.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())) {
      notify("E-mail de suporte inválido.", "error");
      return;
    }
    const payload: ShopSettings = {
      freeShippingFrom: Math.round(freeShippingFrom),
      supportEmail: supportEmail.trim(),
      announcementText: announcementText.trim().slice(0, 200),
      announcementActive: announcementActive && announcementText.trim() !== "",
      updatedAt: settings.settings?.updatedAt ?? "",
    };
    const result = await settings.save(payload);
    if (result.ok) {
      notify("Configurações atualizadas — a loja reflete em até 5 minutos.", "success");
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para alterar as configurações." />;
  }

  const allowed = roleLoading || can("settings.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">settings.view</code> — configurações ficam só com o
          Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("settings.edit");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Configurações</p>
          <p className="text-xs text-[var(--text-muted)]">
            Definições da loja com efeito real na vitrine — somente administrador (§12/§13)
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            disabled={settings.busy}
            onClick={() => void handleSave()}
          >
            {settings.busy ? "Gravando…" : "Salvar configurações"}
          </button>
        )}
      </div>

      {settings.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando configurações…</p>
      )}
      {settings.error && <p className="text-sm text-[#e5484d]">{settings.error}</p>}

      {!settings.loading && !settings.error && (
        <>
          {settings.isDefault && (
            <p className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-gold">
              Nenhuma configuração gravada — valem os padrões da loja. Salve para registrar.
            </p>
          )}

          <Card title="Frete grátis (§17)">
            <Field
              label="Subtotal a partir de (R$)"
              hint="Alimenta a cotação, o checkout e a barra do carrinho."
            >
              <NumberInput value={freeShippingFrom} min={0} step={1} onChange={setFreeShippingFrom} />
            </Field>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Hoje: {formatPrice(freeShippingFrom)} — pedidos físicos a partir desse valor saem com
              frete grátis.
            </p>
          </Card>

          <Card title="Atendimento">
            <Field label="E-mail de suporte" hint="Exibido na página de contato.">
              <TextInput
                value={supportEmail}
                placeholder="suporte@cliffhangerstore.xyz"
                onChange={setSupportEmail}
              />
            </Field>
          </Card>

          <Card title="Aviso da home">
            <Field label="Texto (até 200 caracteres)" hint="Vazio ou desligado = sem aviso.">
              <TextArea
                value={announcementText}
                rows={2}
                placeholder="Ex.: Winter Fest — até 30% OFF só esta semana"
                onChange={setAnnouncementText}
              />
            </Field>
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={announcementActive}
                  onChange={(event) => setAnnouncementActive(event.target.checked)}
                />
                Exibir no topo da home
              </label>
            </div>
            {announcementText.trim() && announcementActive && (
              <p className="mt-3 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-center text-xs font-bold uppercase tracking-wider text-gold">
                {announcementText.trim()}
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
