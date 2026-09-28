"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { Card, Field, SelectInput, TextInput } from "@/components/admin/form-fields";
import { QrSvg } from "@/components/admin/QrSvg";
import { useAdminQrCodes } from "@/components/admin/useAdminPlus";
import {
  QR_CATALOG_TYPES,
  QR_TARGET_LABELS,
  QR_TARGET_TYPES,
  blankQrForm,
  qrShareUrl,
  sanitizeQrInput,
  toQrForm,
  type QrCodeEntry,
  type QrForm,
  type QrTargetType,
} from "@/lib/qr-fields";

/**
 * §34 — QR Codes no painel: gerar e administrar códigos associados a
 * conteúdos (obra, produto, audiobook, capítulo bônus, making-of, arte,
 * wallpaper, soundtrack, conteúdo extra, certificado e evento),
 * conectando o produto físico ao conteúdo digital.
 */

type Editing = { mode: "novo" } | { mode: "editar"; entry: QrCodeEntry } | null;

function targetPrefix(type: QrTargetType): string {
  if (type === "obra") return "/obras/";
  return "/produtos/";
}

export default function AdminQrCodesPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const qr = useAdminQrCodes();

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<QrForm>(blankQrForm);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof QrForm>(key: K, value: QrForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isCatalog = QR_CATALOG_TYPES.includes(form.type);

  const targetOptions = (() => {
    const options = qr.list?.options;
    if (!options) return [];
    if (form.type === "obra") {
      return options.obras.map((obra) => ({ value: obra.slug, label: obra.title }));
    }
    const produtos = options.produtos.filter((product) =>
      form.type === "audiobook" ? product.type === "audiobook" : product.type !== "audiobook",
    );
    return produtos.map((product) => ({ value: product.slug, label: product.title }));
  })();

  const selectedSlug = form.target.split("/").filter(Boolean).pop() ?? "";

  const handleSave = async () => {
    const parsed = sanitizeQrInput(form, editing?.mode === "editar" ? editing.entry : null);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const isNew = editing?.mode === "novo";
    const result = await qr.save(parsed.item, isNew);
    if (result.ok) {
      notify(
        isNew ? `QR Code “${parsed.item.label}” criado.` : "QR Code atualizado.",
        "success",
      );
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleToggle = async (entry: QrCodeEntry) => {
    const parsed = sanitizeQrInput({ ...entry, active: !entry.active }, entry);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    setBusyId(entry.id);
    const result = await qr.save(parsed.item, false);
    setBusyId(null);
    if (result.ok) notify(parsed.item.active ? "QR Code ativado." : "QR Code desativado.", "success");
    else notify(result.message, "error");
  };

  const handleRemove = async (entry: QrCodeEntry) => {
    if (!window.confirm(`Excluir o QR Code “${entry.label}”?`)) return;
    setBusyId(entry.id);
    const result = await qr.remove(entry.id);
    setBusyId(null);
    if (result.ok) notify("QR Code excluído.", "success");
    else notify(result.message, "error");
  };

  const handleCopy = async (entry: QrCodeEntry) => {
    try {
      await navigator.clipboard.writeText(qrShareUrl(entry.target));
      notify("Endereço copiado.", "success");
    } catch {
      notify("Não foi possível copiar — copie manualmente o endereço.", "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar os QR Codes." />;
  }

  const allowed = roleLoading || can("digital.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">digital.view</code> — QR Codes acompanham o grupo Digital
          (§34/§35).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("digital.edit");
  const items = qr.list?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">QR Codes</p>
          <p className="text-xs text-[var(--text-muted)]">
            Códigos que conectam o produto físico ao conteúdo digital (§34)
            {qr.list ? ` · ${items.length} código(s)` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setEditing({ mode: "novo" });
              setForm(blankQrForm());
            }}
          >
            Novo QR Code
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Códigos
          </p>
          <p className="mt-1 text-2xl font-bold">{qr.list ? items.length : "—"}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {items.filter((entry) => entry.active).length} ativo(s)
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Alvos do catálogo
          </p>
          <p className="mt-1 text-2xl font-bold">
            {qr.list
              ? `${qr.list.options.obras.length} / ${qr.list.options.produtos.length}`
              : "—"}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">obras / produtos disponíveis</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Tipo de conteúdo
          </p>
          <p className="mt-1 text-2xl font-bold">{QR_TARGET_TYPES.length}</p>
          <p className="text-[11px] text-[var(--text-muted)]">categorias aceitas (§34)</p>
        </div>
      </div>

      {editing && (
        <Card
          title={editing.mode === "novo" ? "Novo QR Code" : `Editar — ${editing.entry.label}`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <TextInput
                value={form.label}
                placeholder="Ex.: QR capa Sertão 2099"
                onChange={(value) => set("label", value)}
              />
            </Field>
            <Field label="Aponta para">
              <SelectInput
                value={form.type}
                options={QR_TARGET_TYPES.map((type) => ({
                  value: type,
                  label: QR_TARGET_LABELS[type],
                }))}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, type: value as QrTargetType, target: "" }))
                }
              />
            </Field>
            <Field
              label={isCatalog ? "Conteúdo" : "Destino"}
              hint={
                isCatalog
                  ? "Escolha no catálogo — o endereço público é montado sozinho."
                  : "Caminho começando com / ou URL http(s)."
              }
            >
              {isCatalog ? (
                <SelectInput
                  value={selectedSlug}
                  options={[
                    { value: "", label: "— selecione —" },
                    ...(selectedSlug &&
                    !targetOptions.some((option) => option.value === selectedSlug)
                      ? [{ value: selectedSlug, label: form.target }]
                      : []),
                    ...targetOptions,
                  ]}
                  onChange={(slug) => set("target", slug ? `${targetPrefix(form.type)}${slug}` : "")}
                />
              ) : (
                <TextInput
                  value={form.target}
                  placeholder="/conteudo/making-of-sertao-2099"
                  onChange={(value) => set("target", value)}
                />
              )}
            </Field>
            <div className="pb-1">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Situação
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => set("active", event.target.checked)}
                />
                QR Code ativo
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[#F8FEFF] p-2">
              <QrSvg value={qrShareUrl(form.target)} size={128} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-all font-mono text-xs text-[var(--text-muted)]">
                {form.target ? qrShareUrl(form.target) : "selecione um destino para gerar o QR"}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 text-[11px]"
                  disabled={qr.busy}
                  onClick={() => void handleSave()}
                >
                  {qr.busy ? "Gravando…" : "Salvar QR Code"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-4 py-2 text-[11px]"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {qr.loading && <p className="text-sm text-[var(--text-muted)]">Carregando QR Codes…</p>}
      {qr.error && <p className="text-sm text-[#e5484d]">{qr.error}</p>}

      {!qr.loading && !qr.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum QR Code gerado — crie o primeiro com “Novo QR Code”.
        </p>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((entry) => (
            <div key={entry.id} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-gold">{entry.label}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {QR_TARGET_LABELS[entry.type]}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    entry.active
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {entry.active ? "ativo" : "inativo"}
                </span>
              </div>

              <div className="flex justify-center rounded-xl border border-[var(--border)] bg-[#F8FEFF] p-3">
                <QrSvg value={qrShareUrl(entry.target)} size={148} />
              </div>

              <p className="break-all font-mono text-[11px] text-[var(--text-muted)]">
                {qrShareUrl(entry.target)}
              </p>

              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-[11px]"
                    onClick={() => void handleCopy(entry)}
                  >
                    Copiar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-[11px]"
                    onClick={() => {
                      setEditing({ mode: "editar", entry });
                      setForm(toQrForm(entry));
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-[11px]"
                    disabled={qr.busy || busyId === entry.id}
                    onClick={() => void handleToggle(entry)}
                  >
                    {entry.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-[11px] text-[#e5484d]"
                    disabled={qr.busy || busyId === entry.id}
                    onClick={() => void handleRemove(entry)}
                  >
                    {busyId === entry.id ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
