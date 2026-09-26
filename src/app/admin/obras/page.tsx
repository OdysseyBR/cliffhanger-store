"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminCatalog } from "@/components/admin/useAdminCatalog";
import {
  Card,
  Field,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { readText, sanitizeWork, slugify } from "@/lib/catalog-fields";
import { COVER_MOTIF_OPTIONS } from "@/lib/product-fields";
import type { Author, CoverMotif, Universe, Work } from "@/lib/types";

/**
 * Módulo Obras do painel (Documento de Correção §12 — grupo Catálogo).
 * Universo → Obra → Produtos (seção 5.1): cadastro editorial com autor,
 * universo, ano, série e capa procedural; a loja publica por slug.
 */

interface FormState {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  authorId: string;
  universeId: string;
  year: string;
  seriesName: string;
  seriesIndex: string;
  synopsis: string;
  coverBg: string;
  coverFg: string;
  coverAccent: string;
  coverMotif: CoverMotif;
}

const BLANK: FormState = {
  id: "",
  title: "",
  subtitle: "",
  slug: "",
  authorId: "",
  universeId: "",
  year: String(new Date().getFullYear()),
  seriesName: "",
  seriesIndex: "",
  synopsis: "",
  coverBg: "#0C0014",
  coverFg: "#F8FEFF",
  coverAccent: "#FDC500",
  coverMotif: "farol",
};

function toForm(work: Work): FormState {
  return {
    id: work.id,
    title: work.title,
    subtitle: readText(work.subtitle),
    slug: work.slug,
    authorId: work.authorId,
    universeId: work.universeId,
    year: String(work.year),
    seriesName: readText(work.seriesName),
    seriesIndex: work.seriesIndex != null ? String(work.seriesIndex) : "",
    synopsis: readText(work.synopsis),
    coverBg: work.cover?.bg ?? "#0C0014",
    coverFg: work.cover?.fg ?? "#F8FEFF",
    coverAccent: work.cover?.accent ?? "#FDC500",
    coverMotif: work.cover?.motif ?? "farol",
  };
}

export default function AdminWorksPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();

  const works = useAdminCatalog<Work>("works");
  const authors = useAdminCatalog<Author>("authors");
  const universes = useAdminCatalog<Universe>("universes");

  const [editing, setEditing] = useState<Work | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openNew = () => {
    setForm(BLANK);
    setEditing("novo");
  };

  const openEdit = (work: Work) => {
    setForm(toForm(work));
    setEditing(work);
  };

  const handleSave = async () => {
    const existing = editing !== "novo" && editing ? editing : null;
    const draft: Work = {
      id: existing?.id ?? "",
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      slug: slugify(form.slug || form.title),
      authorId: form.authorId,
      universeId: form.universeId,
      synopsis: form.synopsis.trim(),
      year: Number(form.year),
      seriesName: form.seriesName.trim() || undefined,
      seriesIndex: form.seriesIndex ? Number(form.seriesIndex) : undefined,
      cover: {
        bg: form.coverBg,
        fg: form.coverFg,
        accent: form.coverAccent,
        motif: form.coverMotif,
      },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const clean = sanitizeWork(draft);
    if (!clean) {
      notify(
        "Dados inválidos: título, autor, universo e ano entre 1000 e 3000 são obrigatórios.",
        "error",
      );
      return;
    }

    const result = await works.save(clean, editing === "novo");
    if (result.ok) {
      notify(editing === "novo" ? "Obra criada!" : "Obra atualizada!", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleDelete = async (work: Work) => {
    if (!window.confirm(`Excluir a obra ${work.title}?`)) return;
    const result = await works.remove(work.id);
    if (result.ok) {
      notify("Obra excluída", "success");
      setEditing((current) => (current !== "novo" && current?.id === work.id ? null : current));
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar as obras." />;
  }

  const allowed = roleLoading || can("catalog.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">catalog.view</code> — o cadastro editorial é restrito aos
          papéis Administrador, Editorial e Marketing (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("catalog.edit");
  const authorName = (id: string) =>
    authors.items?.find((author) => author.id === id)?.name ?? id;
  const universeName = (id: string) =>
    universes.items?.find((universe) => universe.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Obras</p>
          <p className="text-xs text-[var(--text-muted)]">
            Universo → Obra → Produtos (seção 5.1) — autor, universo, ano, série e capa; publicada
            em /obras/[slug]
            {works.items ? ` · ${works.items.length} cadastrada(s)` : ""}
          </p>
        </div>
        {editing === null && canEdit && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={openNew}
          >
            Nova obra
          </button>
        )}
      </div>

      {editing !== null && (
        <Card title={editing === "novo" ? "Nova obra" : `Editar ${editing.title}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput
                value={form.title}
                placeholder="Ex.: Alvorada Elétrica"
                onChange={(value) => set("title", value)}
              />
            </Field>
            <Field label="Slug (URL)" hint="Em branco é gerado a partir do título.">
              <TextInput
                value={form.slug}
                placeholder="alvorada-eletrica"
                onChange={(value) => set("slug", value)}
              />
            </Field>
            <Field label="Subtítulo" hint="Opcional.">
              <TextInput
                value={form.subtitle}
                placeholder="Ex.: romance em tom de cordel"
                onChange={(value) => set("subtitle", value)}
              />
            </Field>
            <Field label="Ano">
              <NumberInput
                value={Number(form.year) || 0}
                min={1000}
                max={3000}
                step={1}
                onChange={(value) => set("year", String(value))}
              />
            </Field>
            <Field label="Autor">
              <SelectInput
                value={form.authorId}
                options={[
                  { value: "", label: authors.items ? "Selecione…" : "Carregando autores…" },
                  ...(authors.items ?? []).map((author) => ({
                    value: author.id,
                    label: author.name,
                  })),
                ]}
                onChange={(value) => set("authorId", value)}
              />
            </Field>
            <Field label="Universo">
              <SelectInput
                value={form.universeId}
                options={[
                  { value: "", label: universes.items ? "Selecione…" : "Carregando universos…" },
                  ...(universes.items ?? []).map((universe) => ({
                    value: universe.id,
                    label: universe.name,
                  })),
                ]}
                onChange={(value) => set("universeId", value)}
              />
            </Field>
            <Field label="Nome da série" hint="Opcional — ex.: Valeharts.">
              <TextInput
                value={form.seriesName}
                placeholder="Ex.: Valeharts"
                onChange={(value) => set("seriesName", value)}
              />
            </Field>
            <Field label="Nº na série" hint="Opcional — ordem de leitura.">
              <NumberInput
                value={Number(form.seriesIndex) || 0}
                min={1}
                step={1}
                placeholder="—"
                onChange={(value) => set("seriesIndex", String(value))}
              />
            </Field>
            <Field label="Sinopse" className="sm:col-span-2">
              <TextArea
                value={form.synopsis}
                rows={4}
                placeholder="Resumo exibido na página da obra"
                onChange={(value) => set("synopsis", value)}
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Capa (arte)
            </p>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Fundo">
                <input
                  type="color"
                  className="field h-10 w-full"
                  value={form.coverBg}
                  onChange={(event) => set("coverBg", event.target.value)}
                />
              </Field>
              <Field label="Texto">
                <input
                  type="color"
                  className="field h-10 w-full"
                  value={form.coverFg}
                  onChange={(event) => set("coverFg", event.target.value)}
                />
              </Field>
              <Field label="Destaque">
                <input
                  type="color"
                  className="field h-10 w-full"
                  value={form.coverAccent}
                  onChange={(event) => set("coverAccent", event.target.value)}
                />
              </Field>
              <Field label="Motivo">
                <SelectInput
                  value={form.coverMotif}
                  options={COVER_MOTIF_OPTIONS}
                  onChange={(value) => set("coverMotif", value as CoverMotif)}
                />
              </Field>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={works.busy}
              onClick={() => void handleSave()}
            >
              {works.busy ? "Salvando…" : "Salvar obra"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {works.loading && <p className="text-sm text-[var(--text-muted)]">Carregando obras…</p>}
      {works.error && <p className="text-sm text-[#e5484d]">{works.error}</p>}

      {!works.loading && !works.error && works.items && works.items.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma obra cadastrada — cadastre antes os Autores e os Universos e depois monte a obra
          aqui.
        </p>
      )}

      {works.items && works.items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {works.items.map((work) => (
            <div key={work.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{work.title}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {authorName(work.authorId)} · {universeName(work.universeId)} · {work.year}
                  {work.seriesName
                    ? ` · ${work.seriesName}${work.seriesIndex ? ` #${work.seriesIndex}` : ""}`
                    : ""}
                  {" · "}
                  <span className="font-mono">/obras/{work.slug}</span>
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => openEdit(work)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                    disabled={works.busy}
                    onClick={() => void handleDelete(work)}
                  >
                    {works.busy ? "Excluindo…" : "Excluir"}
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
