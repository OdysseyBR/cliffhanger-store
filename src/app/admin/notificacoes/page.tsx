"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminNotifications } from "@/components/admin/useAdminMarketing";
import {
  Card,
  DateTimeInput,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import {
  BLANK_NOTIFICATION_FORM,
  sanitizeNotificationInput,
  toNotificationForm,
  type NotificationForm,
  type NotifyChannel,
} from "@/lib/marketing-fields";
import type { StoreNotification } from "@/lib/types";

/**
 * §12/§16 — Notificações: redação por canal (e-mail, app, push) e público
 * (base ou clube), com o fluxo rascunho → agendada → enviada. Enviada é
 * estado final: não volta nem apaga — o histórico precisa ficar.
 */

const CHANNEL_OPTIONS: Array<{ value: NotifyChannel; label: string }> = [
  { value: "email", label: "E-mail" },
  { value: "in_app", label: "App" },
  { value: "push", label: "Push" },
];

const STATUS_TONE: Record<StoreNotification["status"], string> = {
  draft: "border-[var(--border)] text-[var(--text-muted)]",
  scheduled: "border-violet-soft/50 text-violet-soft",
  sent: "border-gold/50 bg-gold/10 text-gold",
};

const STATUS_LABEL: Record<StoreNotification["status"], string> = {
  draft: "rascunho",
  scheduled: "agendada",
  sent: "enviada",
};

function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function Label({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
        tone ?? "border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      {children}
    </span>
  );
}

/** Agendamento padrão do atalho "Agendar +1h" (fora do componente — regra de pureza). */
function oneHourAhead(): string {
  return new Date(Date.now() + 3600_000).toISOString().slice(0, 16);
}

export default function AdminNotificationsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const notifications = useAdminNotifications();

  const [editing, setEditing] = useState<StoreNotification | "novo" | null>(null);
  const [form, setForm] = useState<NotificationForm>(BLANK_NOTIFICATION_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof NotificationForm>(key: K, value: NotificationForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleChannel = (channel: NotifyChannel) =>
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));

  const handleSave = async () => {
    const existing = editing && editing !== "novo" ? editing : null;
    const parsed = sanitizeNotificationInput(form, existing);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await notifications.save(parsed.item, editing === "novo");
    if (result.ok) {
      notify(
        editing === "novo" ? `Notificação “${parsed.item.title}” criada.` : `Notificação “${parsed.item.title}” atualizada.`,
        "success",
      );
      setEditing(null);
      setForm(BLANK_NOTIFICATION_FORM);
    } else {
      notify(result.message, "error");
    }
  };

  /** Atalho de fluxo: agenda para daqui a 1h ou marca como enviada. */
  const handleFlow = async (item: StoreNotification, next: StoreNotification["status"]) => {
    const scheduledAt =
      next === "scheduled" ? oneHourAhead() : toNotificationForm(item).scheduledAt;
    const parsed = sanitizeNotificationInput(
      { ...toNotificationForm(item), status: next, scheduledAt },
      item,
    );
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    setBusyId(item.id);
    const result = await notifications.save(parsed.item, false);
    setBusyId(null);
    if (result.ok) notify(`Notificação ${STATUS_LABEL[next]}.`, "success");
    else notify(result.message, "error");
  };

  const handleRemove = async (item: StoreNotification) => {
    if (!window.confirm(`Excluir a notificação “${item.title}”? Enviadas não podem ser excluídas.`)) {
      return;
    }
    setBusyId(item.id);
    const result = await notifications.remove(item.id);
    setBusyId(null);
    if (result.ok) notify("Notificação excluída.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar as notificações." />;
  }

  const allowed = roleLoading || can("notifications.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">notifications.view</code> — notificações ficam com Marketing
          e Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("notifications.edit");
  const items = notifications.items ?? [];

  const totals = {
    all: items.length,
    drafts: items.filter((item) => item.status === "draft").length,
    scheduled: items.filter((item) => item.status === "scheduled").length,
    sent: items.filter((item) => item.status === "sent").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Notificações</p>
          <p className="text-xs text-[var(--text-muted)]">
            Comunicados por canal e público — rascunho, agendamento e envio (§16)
            {notifications.items ? ` · ${totals.all} notificação(ões)` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setEditing("novo");
              setForm(BLANK_NOTIFICATION_FORM);
            }}
          >
            Nova notificação
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Notificações
          </p>
          <p className="text-lg font-bold">{totals.all}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Rascunhos
          </p>
          <p className="text-lg font-bold">{totals.drafts}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Agendadas
          </p>
          <p className="text-lg font-bold text-gold">{totals.scheduled}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Enviadas
          </p>
          <p className="text-lg font-bold">{totals.sent}</p>
        </div>
      </div>

      {editing && (
        <Card title={editing === "novo" ? "Nova notificação" : `Editar — ${form.title || "sem título"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput value={form.title} placeholder="Ex.: Winter Fest começou" onChange={(v) => set("title", v)} />
            </Field>
            <Field label="Texto">
              <TextArea value={form.body} rows={3} placeholder="Mensagem ao cliente." onChange={(v) => set("body", v)} />
            </Field>
            <div className="pb-1 text-xs text-[var(--text-muted)]">
              <p className="mb-1 font-bold uppercase tracking-wider">Canais</p>
              <div className="flex flex-wrap gap-4">
                {CHANNEL_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.channels.includes(option.value)}
                      onChange={() => toggleChannel(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Público-alvo">
              <SelectInput
                value={form.targetAudience}
                options={[
                  { value: "all", label: "Toda a base" },
                  { value: "club", label: "Membros do clube" },
                ]}
                onChange={(v) => set("targetAudience", v as "all" | "club")}
              />
            </Field>
            <Field label="Estado">
              <SelectInput
                value={form.status}
                options={[
                  { value: "draft", label: "Rascunho" },
                  { value: "scheduled", label: "Agendada" },
                  { value: "sent", label: "Enviada" },
                ]}
                onChange={(v) => set("status", v as StoreNotification["status"])}
              />
            </Field>
            {form.status === "scheduled" && (
              <Field label="Disparar em" hint="Precisa ser no futuro.">
                <DateTimeInput value={form.scheduledAt} onChange={(v) => set("scheduledAt", v)} />
              </Field>
            )}
          </div>

          {form.status === "sent" && (
            <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-gold">
              Marcar como enviada é definitivo: a notificação sai do fluxo de edição e não pode
              ser excluída — o histórico precisa ficar.
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={notifications.busy}
              onClick={() => void handleSave()}
            >
              {notifications.busy ? "Gravando…" : "Salvar notificação"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing(null);
                setForm(BLANK_NOTIFICATION_FORM);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {notifications.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando notificações…</p>
      )}
      {notifications.error && <p className="text-sm text-[#e5484d]">{notifications.error}</p>}

      {!notifications.loading && !notifications.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma notificação redigida — crie a primeira com o botão “Nova notificação”.
        </p>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{item.title || "(sem título)"}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {item.channels.join(" + ")} → {item.targetAudience === "club" ? "clube" : "toda a base"}
                  {item.status === "scheduled" ? ` · dispara em ${when(item.scheduledAt)}` : ""} ·{" "}
                  atualizada em {when(item.updatedAt)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{item.body}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Label tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Label>
                </div>
              </div>

              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  {item.status === "draft" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-2 text-[11px]"
                        disabled={notifications.busy || busyId === item.id}
                        onClick={() => void handleFlow(item, "scheduled")}
                      >
                        Agendar +1h
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary px-3 py-2 text-[11px]"
                        disabled={notifications.busy || busyId === item.id}
                        onClick={() => void handleFlow(item, "sent")}
                      >
                        Marcar enviada
                      </button>
                    </>
                  )}
                  {item.status === "scheduled" && (
                    <button
                      type="button"
                      className="btn btn-primary px-3 py-2 text-[11px]"
                      disabled={notifications.busy || busyId === item.id}
                      onClick={() => void handleFlow(item, "sent")}
                    >
                      Marcar enviada
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setEditing(item);
                      setForm(toNotificationForm(item));
                    }}
                  >
                    Editar
                  </button>
                  {item.status !== "sent" && (
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      disabled={busyId === item.id}
                      onClick={() => void handleRemove(item)}
                    >
                      {busyId === item.id ? "Excluindo…" : "Excluir"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
