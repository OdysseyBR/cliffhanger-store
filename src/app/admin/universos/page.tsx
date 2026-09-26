"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminCatalog } from "@/components/admin/useAdminCatalog";
import {
  Card,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { readText, sanitizeUniverse, slugify } from "@/lib/catalog-fields";
import { COVER_MOTIF_OPTIONS } from "@/lib/product-fields";
import type { CoverMotif, Universe } from "@/lib/types";

/**
 * Módulo Universos do painel (Documento de Correção §12 — grupo Catálogo).
 * Os universos agrupam obras e produtos na loja (/universos/[slug]).
 */

interface FormState {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coverBg: string;
  coverFg: string;
  coverAccent: string;
  coverMotif: CoverMotif;
}

const BLANK: FormState = {
  id: "",
  name: "",
  slug: "",
  tagline: "",
  description: "",
  coverBg: "#0C0014",
  coverFg: "#F8FEFF",
  coverAccent: "#FDC500",
  coverMotif: "farol",
};

function toForm(universe: Universe): FormState {
  return {
    id: universe.id,
    name: universe.name,
    slug: universe.slug,
    tagline: readText(universe.tagline),
    description: readText(universe.description),
    coverBg: universe.cover?.bg ?? "#0C0014",
    coverFg: universe.cover?.fg ?? "#F8FEFF",
    coverAccent: universe.cover?.accent ?? "#FDC500",
    coverMotif: universe.cover?.motif ?? "farol",
  };
}

export default function AdminUniversesPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const universes = useAdminCatalog<Universe>("universes");

  const [editing, setEditing] = useState<Universe | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const existing = editing !== "novo" && editing ? editing : null;
    const draft: Universe = {
      id: existing?.id ?? "",
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      cover: {
        bg: form.coverBg,
        fg: form.coverFg,
        accent: form.coverAccent,
        motif: form.coverMotif,
      },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const clean = sanitizeUniverse(draft);
    if (!clean) {
      notify("Dados inválidos: nome do universo é obrigatório.", "error");
      return;
    }

    const result = await universes.save(clean, editing === "novo");
    if (result.ok) {
      notify(editing === "novo" ? "Universo criado!" : "Universo atualizado!", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleDelete = async (universe: Universe) => {
    if (!window.confirm(`Excluir o universo ${universe.name}?`)) return;
    const result = await universes.remove(universe.id);
    if (result.ok) {
      notify("Universo excluído", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar os universos." />;
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Universos</p>
          <p className="text-xs text-[var(--text-muted)]">
            Agrupam obras e produtos da loja em /universos/[slug] — nome, chamada, descrição e capa
            {universes.items ? ` · ${universes.items.length} cadastrado(s)` : ""}
          </p>
        </div>
        {editing === null && canEdit && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setForm(BLANK);
              setEditing("novo");
            }}
          >
            Novo universo
          </button>
        )}
      </div>

      {editing !== null && (
        <Card title={editing === "novo" ? "Novo universo" : `Editar ${editing.name}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <TextInput
                value={form.name}
                placeholder="Ex.: Valeharts"
                onChange={(value) => set("name", value)}
              />
            </Field>
            <Field label="Slug (URL)" hint="Em branco é gerado a partir do nome.">
              <TextInput
                value={form.slug}
                placeholder="valeharts"
                onChange={(value) => set("slug", value)}
              />
            </Field>
            <Field label="Chamada" className="sm:col-span-2">
              <TextInput
                value={form.tagline}
                placeholder="Frase de destaque exibida na capa do universo"
                onChange={(value) => set("tagline", value)}
              />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <TextArea
                value={form.description}
                rows={4}
                placeholder="Texto editorial do universo"
                onChange={(value) => set("description", value)}
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
              disabled={universes.busy}
              onClick={() => void handleSave()}
            >
              {universes.busy ? "Salvando…" : "Salvar universo"}
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

      {universes.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando universos…</p>
      )}
      {universes.error && <p className="text-sm text-[#e5484d]">{universes.error}</p>}

      {!universes.loading && !universes.error && universes.items?.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum universo cadastrado — crie o primeiro para agrupar obras e produtos.
        </p>
      )}

      {universes.items && universes.items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {universes.items.map((universe) => (
            <div key={universe.id} className="flex flex-wrap items-center gap-3 p-4">
              <span
                aria-hidden="true"
                className="h-8 w-8 shrink-0 rounded-sm border border-[var(--border)]"
                style={{ backgroundColor: universe.cover?.bg ?? "#0C0014" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{universe.name}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {universe.tagline || "sem chamada"} ·{" "}
                  <span className="font-mono">/universos/{universe.slug}</span>
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setForm(toForm(universe));
                      setEditing(universe);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                    disabled={universes.busy}
                    onClick={() => void handleDelete(universe)}
                  >
                    {universes.busy ? "Excluindo…" : "Excluir"}
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
