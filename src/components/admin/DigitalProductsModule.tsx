"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminDigitalProducts } from "@/components/admin/useAdminDigital";
import {
  Card,
  Field,
  NumberInput,
  SelectInput,
  TextInput,
} from "@/components/admin/form-fields";
import {
  sanitizeDigitalInput,
  toDigitalForm,
  type DigitalFormState,
  type DigitalModuleKind,
} from "@/lib/digital-fields";
import type { Chapter, DigitalFile, Product } from "@/lib/types";

/**
 * §12/§8 — módulo de conteúdo digital do painel, compartilhado entre
 * E-books (`kind="pdf"`) e Audiobooks (`kind="audio"`): lista os produtos
 * do tipo, mostra arquivo/sumário/download e edita os três campos da
 * plataforma digital. A validação e a auditoria vivem em `digital-fields`
 * e em `/api/admin/digital/products`.
 */

interface ModuleMeta {
  title: string;
  subtitle: string;
  loginNote: string;
  noPermission: string;
  addFile: string;
  fileKindLabel: string;
  startLabel: string;
  startHint: string;
  chapterWord: string;
  empty: string;
}

const META: Record<DigitalModuleKind, ModuleMeta> = {
  pdf: {
    title: "E-books",
    subtitle:
      "Arquivos PDF, sumário de capítulos e permissão de download da plataforma digital (§8)",
    loginNote: "Entre com a conta administradora para gerenciar os e-books.",
    noPermission:
      "Os e-books exigem a permissão digital.view — elas ficam com os papéis que operam a biblioteca (§13).",
    addFile: "Adicionar PDF",
    fileKindLabel: "PDF",
    startLabel: "Página inicial",
    startHint: "1 = primeira página",
    chapterWord: "Capítulo",
    empty:
      "Nenhum e-book no painel — cadastre o produto em Produtos (tipo “e-book”) e volte aqui para enviar o PDF e o sumário.",
  },
  audio: {
    title: "Audiobooks",
    subtitle:
      "Arquivos de áudio, capítulos e permissão de download da plataforma digital (§8)",
    loginNote: "Entre com a conta administradora para gerenciar os audiobooks.",
    noPermission:
      "Os audiobooks exigem a permissão digital.view — elas ficam com os papéis que operam a biblioteca (§13).",
    addFile: "Adicionar áudio",
    fileKindLabel: "áudio",
    startLabel: "Início (s)",
    startHint: "segundo inicial do capítulo",
    chapterWord: "Faixa",
    empty:
      "Nenhum audiobook no painel — cadastre o produto em Produtos (tipo “audiobook”) e volte aqui para enviar o áudio e os capítulos.",
  },
};

type StatusFilter = "all" | "sem-arquivo" | "sem-entrega" | "download" | "sem-download";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "sem-arquivo", label: "Sem arquivo" },
  { value: "sem-entrega", label: "Entrega digital desativada" },
  { value: "download", label: "Download liberado" },
  { value: "sem-download", label: "Download bloqueado" },
];

function statusKeys(product: Product): StatusFilter[] {
  const files = product.files ?? [];
  const keys: StatusFilter[] = [];
  if (files.length === 0) keys.push("sem-arquivo");
  if (product.digital !== true) keys.push("sem-entrega");
  keys.push(files.some((file) => file.allowDownload !== false) ? "download" : "sem-download");
  return keys;
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

export function DigitalProductsModule({ kind }: { kind: DigitalModuleKind }) {
  const meta = META[kind];
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const digital = useAdminDigitalProducts(kind);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DigitalFormState>({ digital: false, files: [], chapters: [] });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const items = digital.items ?? [];
  const editing = editingId ? items.find((product) => product.id === editingId) ?? null : null;

  const patch = (changes: Partial<DigitalFormState>) =>
    setForm((prev) => ({ ...prev, ...changes }));

  const updateFile = (index: number, changes: Partial<DigitalFile>) =>
    setForm((prev) => ({
      ...prev,
      files: prev.files.map((file, i) => (i === index ? { ...file, ...changes } : file)),
    }));

  const addFile = () =>
    setForm((prev) => ({
      ...prev,
      files: [
        ...prev.files,
        {
          kind,
          url: "",
          name: editing
            ? `${editing.title} — ${kind === "pdf" ? "E-book (PDF)" : "Audiobook (áudio)"}`
            : "",
          allowDownload: true,
        },
      ],
    }));

  const removeFile = (index: number) =>
    setForm((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));

  const updateChapter = (index: number, changes: Partial<Chapter>) =>
    setForm((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter, i) =>
        i === index ? { ...chapter, ...changes } : chapter,
      ),
    }));

  const addChapter = () =>
    setForm((prev) => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          title: `${meta.chapterWord} ${prev.chapters.length + 1}`,
          start: prev.chapters.at(-1)?.start ?? 0,
        },
      ],
    }));

  const removeChapter = (index: number) =>
    setForm((prev) => ({ ...prev, chapters: prev.chapters.filter((_, i) => i !== index) }));

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm(toDigitalForm(product));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ digital: false, files: [], chapters: [] });
  };

  const handleSave = async () => {
    if (!editing) return;
    const parsed = sanitizeDigitalInput(form, kind);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await digital.save(editing.id, parsed.form);
    if (result.ok) {
      notify(
        result.data.changed
          ? `Conteúdo digital de “${editing.title}” atualizado.`
          : "Nada mudou — os dados já eram os mesmos.",
        "success",
      );
      cancelEdit();
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note={meta.loginNote} />;
  }

  const allowed = roleLoading || can("digital.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">digital.view</code> — {meta.noPermission}
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("digital.edit");

  const list = items.filter((product) => {
    const matchesQuery =
      !query.trim() ||
      product.title.toLowerCase().includes(query.trim().toLowerCase()) ||
      product.id.toLowerCase().includes(query.trim().toLowerCase()) ||
      (product.slug ?? "").toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || statusKeys(product).includes(status);
    return matchesQuery && matchesStatus;
  });

  const totals = {
    titles: items.length,
    withFile: items.filter((product) => (product.files?.length ?? 0) > 0).length,
    withoutFile: items.filter((product) => (product.files?.length ?? 0) === 0).length,
    chapters: items.reduce((sum, product) => sum + (product.chapters?.length ?? 0), 0),
    downloads: items.filter((product) =>
      (product.files ?? []).some((file) => file.allowDownload !== false),
    ).length,
  };

  const warnings: string[] = [];
  if (editing) {
    if (form.digital && form.files.length === 0) {
      warnings.push("Entrega digital ligada, mas sem arquivo: quem comprar não consegue ler/ouvir nada.");
    }
    if (!form.digital && form.files.length > 0) {
      warnings.push(
        "Arquivos cadastrados, mas a entrega digital está desligada — o item não entra na biblioteca do cliente.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">{meta.title}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {meta.subtitle}
            {digital.items ? ` · ${totals.titles} título(s)` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Títulos
          </p>
          <p className="text-lg font-bold">{totals.titles}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Com arquivo
          </p>
          <p className="text-lg font-bold text-gold">{totals.withFile}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Sem arquivo
          </p>
          <p className={`text-lg font-bold ${totals.withoutFile > 0 ? "text-[#e5484d]" : ""}`}>
            {totals.withoutFile}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Capítulos
          </p>
          <p className="text-lg font-bold">{totals.chapters}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Download liberado
          </p>
          <p className="text-lg font-bold">{totals.downloads}</p>
        </div>
      </div>

      {editing && (
        <Card title={`Editar — ${editing.title}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-wrap items-end gap-5 pb-1 text-xs text-[var(--text-muted)]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.digital}
                  onChange={(event) => patch({ digital: event.target.checked })}
                />
                Entrega digital (vai para a biblioteca do cliente)
              </label>
              <span>
                {form.files.some((file) => file.allowDownload !== false)
                  ? "Pelo menos um arquivo permite download"
                  : "Download bloqueado em todos os arquivos"}
              </span>
            </div>
            <div className="pb-1 text-right text-xs text-[var(--text-muted)]">
              <p>
                id <span className="font-mono">{editing.id}</span>
              </p>
              <p>
                /produtos/{editing.slug}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Arquivos ({form.files.length} de 3) — {meta.fileKindLabel}
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-[11px]"
                  onClick={addFile}
                  disabled={form.files.length >= 3}
                >
                  {meta.addFile}
                </button>
              )}
            </div>

            {form.files.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Sem arquivo — o leitor e o player não abrem nada até você cadastrar o {meta.fileKindLabel}.
              </p>
            )}

            <div className="space-y-2">
              {form.files.map((file, index) => (
                <div
                  key={`file-${index}`}
                  className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:grid-cols-4"
                >
                  <Field label="Nome exibido">
                    <TextInput
                      value={file.name}
                      placeholder={`${editing.title} — ${meta.fileKindLabel}`}
                      onChange={(value) => updateFile(index, { name: value })}
                    />
                  </Field>
                  <Field label="URL do arquivo" hint="https://… ou caminho iniciado em /">
                    <TextInput
                      value={file.url}
                      placeholder="https://res.cloudinary.com/…"
                      onChange={(value) => updateFile(index, { url: value })}
                    />
                  </Field>
                  <div className="flex items-end gap-4 pb-1 text-xs text-[var(--text-muted)]">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={file.allowDownload}
                        onChange={(event) =>
                          updateFile(index, { allowDownload: event.target.checked })
                        }
                      />
                      Permite download
                    </label>
                  </div>
                  <div className="flex items-end justify-end pb-1">
                    <button
                      type="button"
                      className="btn btn-ghost px-2 py-2 text-[11px]"
                      onClick={() => removeFile(index)}
                      aria-label={`Remover arquivo ${file.name || index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Sumário ({form.chapters.length} capítulo(s)) — {meta.startHint}
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-[11px]"
                  onClick={addChapter}
                  disabled={form.chapters.length >= 200}
                >
                  Adicionar capítulo
                </button>
              )}
            </div>

            {form.chapters.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Sem sumário — o leitor/player navega sem capítulos.
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {form.chapters.map((chapter, index) => (
                <div
                  key={`chapter-${index}`}
                  className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:grid-cols-3"
                >
                  <Field label="Título">
                    <TextInput
                      value={chapter.title}
                      onChange={(value) => updateChapter(index, { title: value })}
                    />
                  </Field>
                  <Field label={meta.startLabel} hint={kind === "audio" ? "aceita fração (ex.: 22.67)" : undefined}>
                    <NumberInput
                      value={chapter.start}
                      min={0}
                      step={kind === "audio" ? 0.01 : 1}
                      onChange={(value) => updateChapter(index, { start: value })}
                    />
                  </Field>
                  <div className="flex items-end justify-end pb-1">
                    <button
                      type="button"
                      className="btn btn-ghost px-2 py-2 text-[11px]"
                      onClick={() => removeChapter(index)}
                      aria-label={`Remover capítulo ${chapter.title || index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 space-y-1 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-gold">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={digital.busy || !canEdit}
              onClick={() => void handleSave()}
            >
              {digital.busy ? "Gravando…" : "Salvar conteúdo digital"}
            </button>
            <button type="button" className="btn btn-ghost px-4 py-2 text-[11px]" onClick={cancelEdit}>
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-72">
          <TextInput value={query} placeholder="Buscar por título, id ou slug" onChange={setQuery} />
        </div>
        <div className="w-64">
          <SelectInput value={status} options={STATUS_OPTIONS} onChange={(v) => setStatus(v as StatusFilter)} />
        </div>
      </div>

      {digital.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando {meta.title.toLowerCase()}…</p>
      )}
      {digital.error && <p className="text-sm text-[#e5484d]">{digital.error}</p>}

      {!digital.loading && !digital.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">{meta.empty}</p>
      )}

      {!digital.loading && !digital.error && items.length > 0 && list.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Nenhum título corresponde ao filtro.</p>
      )}

      {list.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {list.map((product) => {
            const files = product.files ?? [];
            const chapters = product.chapters ?? [];
            return (
              <div key={product.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gold">{product.title}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    /produtos/{product.slug} · {files.length} arquivo(s) · {chapters.length}{" "}
                    capítulo(s)
                    {files[0] ? ` · ${files.map((file) => file.name).join(", ")}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {files.length === 0 ? (
                      <Label tone="border-[#e5484d]/50 text-[#e5484d]">sem arquivo</Label>
                    ) : (
                      <Label tone="border-gold/50 bg-gold/10 text-gold">{meta.fileKindLabel}</Label>
                    )}
                    {product.digital === true ? (
                      <Label tone="border-violet-soft/50 text-violet-soft">entrega digital</Label>
                    ) : (
                      <Label tone="border-[#e5484d]/50 text-[#e5484d]">entrega inativa</Label>
                    )}
                    {files.some((file) => file.allowDownload !== false) ? (
                      <Label>download liberado</Label>
                    ) : (
                      <Label>download bloqueado</Label>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      onClick={() => startEdit(product)}
                    >
                      Editar conteúdo
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
