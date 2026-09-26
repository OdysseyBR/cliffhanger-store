"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminCatalog } from "@/components/admin/useAdminCatalog";
import { Card, Field, TextArea, TextInput } from "@/components/admin/form-fields";
import { readText, sanitizeAuthor, slugify } from "@/lib/catalog-fields";
import type { Author, Work } from "@/lib/types";

/**
 * Módulo Autores do painel (Documento de Correção §12 — grupo Catálogo).
 * Nome, função e texto biográfico — vinculados às obras e aos produtos
 * da loja (/autores/[slug]).
 */

interface FormState {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
}

const BLANK: FormState = { id: "", name: "", slug: "", role: "", bio: "" };

function toForm(author: Author): FormState {
  return {
    id: author.id,
    name: author.name,
    slug: author.slug,
    role: readText(author.role),
    bio: readText(author.bio),
  };
}

export default function AdminAuthorsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const authors = useAdminCatalog<Author>("authors");
  const works = useAdminCatalog<Work>("works");

  const [editing, setEditing] = useState<Author | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const existing = editing !== "novo" && editing ? editing : null;
    const draft: Author = {
      id: existing?.id ?? "",
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      role: form.role.trim(),
      bio: form.bio.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const clean = sanitizeAuthor(draft);
    if (!clean) {
      notify("Dados inválidos: nome do autor é obrigatório.", "error");
      return;
    }

    const result = await authors.save(clean, editing === "novo");
    if (result.ok) {
      notify(editing === "novo" ? "Autor criado!" : "Autor atualizado!", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleDelete = async (author: Author) => {
    if (!window.confirm(`Excluir o autor ${author.name}?`)) return;
    const result = await authors.remove(author.id);
    if (result.ok) {
      notify("Autor excluído", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar os autores." />;
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
  const worksOf = (authorId: string) =>
    (works.items ?? []).filter((work) => work.authorId === authorId).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Autores</p>
          <p className="text-xs text-[var(--text-muted)]">
            Cadastro editorial usado pelas obras e pelos produtos — nome, função e texto
            {authors.items ? ` · ${authors.items.length} cadastrado(s)` : ""}
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
            Novo autor
          </button>
        )}
      </div>

      {editing !== null && (
        <Card title={editing === "novo" ? "Novo autor" : `Editar ${editing.name}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <TextInput
                value={form.name}
                placeholder="Ex.: Helena Vasques"
                onChange={(value) => set("name", value)}
              />
            </Field>
            <Field label="Slug (URL)" hint="Em branco é gerado a partir do nome.">
              <TextInput
                value={form.slug}
                placeholder="helena-vasques"
                onChange={(value) => set("slug", value)}
              />
            </Field>
            <Field label="Função" hint="Ex.: escritora, ilustradora, roteirista.">
              <TextInput
                value={form.role}
                placeholder="Ex.: escritora"
                onChange={(value) => set("role", value)}
              />
            </Field>
            <Field label="Texto" className="sm:col-span-2">
              <TextArea
                value={form.bio}
                rows={4}
                placeholder="Biografia exibida na página do autor"
                onChange={(value) => set("bio", value)}
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={authors.busy}
              onClick={() => void handleSave()}
            >
              {authors.busy ? "Salvando…" : "Salvar autor"}
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

      {authors.loading && <p className="text-sm text-[var(--text-muted)]">Carregando autores…</p>}
      {authors.error && <p className="text-sm text-[#e5484d]">{authors.error}</p>}

      {!authors.loading && !authors.error && authors.items?.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum autor cadastrado — as obras precisam de um autor vinculado.
        </p>
      )}

      {authors.items && authors.items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {authors.items.map((author) => (
            <div key={author.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">
                  {author.name}
                  {author.role ? <span className="text-[var(--text-muted)]"> — {author.role}</span> : null}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {worksOf(author.id)} obra(s) ·{" "}
                  <span className="font-mono">/autores/{author.slug}</span>
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setForm(toForm(author));
                      setEditing(author);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                    disabled={authors.busy}
                    onClick={() => void handleDelete(author)}
                  >
                    {authors.busy ? "Excluindo…" : "Excluir"}
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
