"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminCatalog } from "@/components/admin/useAdminCatalog";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { Card, Field, TextArea, TextInput } from "@/components/admin/form-fields";
import { sanitizeCollection, readText, slugify } from "@/lib/catalog-fields";
import type { Collection } from "@/lib/types";

/**
 * Módulo Coleções do painel (Documento de Correção §12 — grupo Catálogo).
 * Curadoria de produtos publicada na loja (card com contagem e atalhos),
 * com seleção dos produtos do catálogo.
 */

interface FormState {
  id: string;
  title: string;
  slug: string;
  description: string;
  productIds: string[];
}

const BLANK: FormState = { id: "", title: "", slug: "", description: "", productIds: [] };

function toForm(collection: Collection): FormState {
  return {
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    description: readText(collection.description),
    productIds: Array.isArray(collection.productIds) ? [...collection.productIds] : [],
  };
}

export default function AdminCollectionsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const collections = useAdminCatalog<Collection>("collections");
  const { products } = useAdminProducts();

  const [editing, setEditing] = useState<Collection | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [filter, setFilter] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleProduct = (id: string) =>
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((current) => current !== id)
        : [...prev.productIds, id],
    }));

  const handleSave = async () => {
    const existing = editing !== "novo" && editing ? editing : null;
    const draft: Collection = {
      id: existing?.id ?? "",
      title: form.title.trim(),
      slug: slugify(form.slug || form.title),
      description: form.description.trim(),
      productIds: form.productIds,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const clean = sanitizeCollection(draft);
    if (!clean) {
      notify("Dados inválidos: título da coleção é obrigatório.", "error");
      return;
    }

    const result = await collections.save(clean, editing === "novo");
    if (result.ok) {
      notify(editing === "novo" ? "Coleção criada!" : "Coleção atualizada!", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleDelete = async (collection: Collection) => {
    if (!window.confirm(`Excluir a coleção ${collection.title}?`)) return;
    const result = await collections.remove(collection.id);
    if (result.ok) {
      notify("Coleção excluída", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar as coleções." />;
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
  const needle = filter.trim().toLowerCase();
  const selectable = (products ?? []).filter((product) =>
    needle ? product.title.toLowerCase().includes(needle) || product.slug.includes(needle) : true,
  );
  const titleOf = (id: string) =>
    (products ?? []).find((product) => product.id === id)?.title ?? id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Coleções</p>
          <p className="text-xs text-[var(--text-muted)]">
            Curadoria de produtos exibida na loja com contagem e atalhos por item
            {collections.items ? ` · ${collections.items.length} cadastrada(s)` : ""}
          </p>
        </div>
        {editing === null && canEdit && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setForm(BLANK);
              setFilter("");
              setEditing("novo");
            }}
          >
            Nova coleção
          </button>
        )}
      </div>

      {editing !== null && (
        <Card title={editing === "novo" ? "Nova coleção" : `Editar ${editing.title}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput
                value={form.title}
                placeholder="Ex.: Edições de Valeharts"
                onChange={(value) => set("title", value)}
              />
            </Field>
            <Field label="Slug (URL)" hint="Em branco é gerado a partir do título.">
              <TextInput
                value={form.slug}
                placeholder="edicoes-de-valeharts"
                onChange={(value) => set("slug", value)}
              />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <TextArea
                value={form.description}
                rows={3}
                placeholder="Texto exibido no card da coleção"
                onChange={(value) => set("description", value)}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Produtos da coleção
              </span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {form.productIds.length} selecionado(s)
              </span>
            </div>
            <TextInput
              value={filter}
              placeholder="Filtrar produtos pelo título"
              onChange={setFilter}
            />
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
              {selectable.length === 0 && (
                <p className="px-2 py-1 text-xs text-[var(--text-muted)]">
                  Nenhum produto corresponde ao filtro.
                </p>
              )}
              {selectable.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-raised)]"
                >
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{product.title}</span>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                    {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={collections.busy}
              onClick={() => void handleSave()}
            >
              {collections.busy ? "Salvando…" : "Salvar coleção"}
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

      {collections.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando coleções…</p>
      )}
      {collections.error && <p className="text-sm text-[#e5484d]">{collections.error}</p>}

      {!collections.loading && !collections.error && collections.items?.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma coleção cadastrada — monte curadorias de produtos para a loja.
        </p>
      )}

      {collections.items && collections.items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {collections.items.map((collection) => (
            <div key={collection.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{collection.title}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {collection.productIds.length} produto(s) ·{" "}
                  {collection.productIds.slice(0, 3).map(titleOf).join(", ")}
                  {collection.productIds.length > 3 ? "…" : ""}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setForm(toForm(collection));
                      setFilter("");
                      setEditing(collection);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                    disabled={collections.busy}
                    onClick={() => void handleDelete(collection)}
                  >
                    {collections.busy ? "Excluindo…" : "Excluir"}
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
