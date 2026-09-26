"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminCatalog } from "@/components/admin/useAdminCatalog";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { Card, Field, NumberInput, SelectInput, TextArea, TextInput } from "@/components/admin/form-fields";
import { CATALOG_TYPE_OPTIONS, readNumber, readText, sanitizeCategory, slugify } from "@/lib/catalog-fields";
import type { Category, CategoryType } from "@/lib/types";

/**
 * Módulo Categorias do painel (Documento de Correção §12 — grupo Catálogo).
 * Coleção `categories`: nome, slug, tipo (físico/digital/híbrido), ordem,
 * descrição e arte. O slug é o valor usado em `products.category`.
 */

interface FormState {
  id: string;
  name: string;
  slug: string;
  typeId: CategoryType;
  sort: string;
  description: string;
  image: string;
}

const BLANK: FormState = {
  id: "",
  name: "",
  slug: "",
  typeId: "fisico",
  sort: "0",
  description: "",
  image: "",
};

function toForm(category: Category): FormState {
  const typeId = CATALOG_TYPE_OPTIONS.some((option) => option.value === category.typeId)
    ? category.typeId
    : "fisico";
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    typeId,
    sort: String(readNumber(category.sort)),
    description: readText(category.description),
    image: readText(category.image),
  };
}

const TYPE_LABEL: Record<CategoryType, string> = {
  fisico: "Físico",
  digital: "Digital",
  hibrido: "Híbrido",
};

export default function AdminCategoriesPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const categories = useAdminCatalog<Category>("categories");
  const { products } = useAdminProducts();

  const [editing, setEditing] = useState<Category | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const existing = editing !== "novo" && editing ? editing : null;
    const draft: Category = {
      id: existing?.id ?? "",
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      typeId: form.typeId,
      sort: Number(form.sort) || 0,
      description: form.description.trim(),
      image: form.image.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const clean = sanitizeCategory(draft);
    if (!clean) {
      notify(
        "Dados inválidos: nome é obrigatório e a imagem precisa ser um caminho (/…) ou URL http(s).",
        "error",
      );
      return;
    }

    const result = await categories.save(clean, editing === "novo");
    if (result.ok) {
      notify(editing === "novo" ? "Categoria criada!" : "Categoria atualizada!", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Excluir a categoria ${category.name}?`)) return;
    const result = await categories.remove(category.id);
    if (result.ok) {
      notify("Categoria excluída", "success");
      setEditing(null);
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar as categorias." />;
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
  const productsOf = (slug: string) =>
    (products ?? []).filter((product) => product.category === slug).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Categorias</p>
          <p className="text-xs text-[var(--text-muted)]">
            Taxonomia de produtos (físico, digital ou híbrido) — slug, ordem e arte
            {categories.items ? ` · ${categories.items.length} cadastrada(s)` : ""}
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
            Nova categoria
          </button>
        )}
      </div>

      {editing !== null && (
        <Card title={editing === "novo" ? "Nova categoria" : `Editar ${editing.name}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <TextInput
                value={form.name}
                placeholder="Ex.: Livros"
                onChange={(value) => set("name", value)}
              />
            </Field>
            <Field label="Slug" hint="Em branco é gerado a partir do nome.">
              <TextInput
                value={form.slug}
                placeholder="livros"
                onChange={(value) => set("slug", value)}
              />
            </Field>
            <Field label="Tipo">
              <SelectInput
                value={form.typeId}
                options={CATALOG_TYPE_OPTIONS}
                onChange={(value) => set("typeId", value as CategoryType)}
              />
            </Field>
            <Field label="Ordem" hint="Menor = aparece primeiro.">
              <NumberInput
                value={Number(form.sort) || 0}
                min={0}
                step={1}
                onChange={(value) => set("sort", String(value))}
              />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <TextArea
                value={form.description}
                rows={3}
                placeholder="Texto curto da categoria (opcional)"
                onChange={(value) => set("description", value)}
              />
            </Field>
            <Field label="Imagem (URL)" className="sm:col-span-2">
              <TextInput
                value={form.image}
                placeholder="https://… ou /caminho"
                onChange={(value) => set("image", value)}
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={categories.busy}
              onClick={() => void handleSave()}
            >
              {categories.busy ? "Salvando…" : "Salvar categoria"}
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

      {categories.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando categorias…</p>
      )}
      {categories.error && <p className="text-sm text-[#e5484d]">{categories.error}</p>}

      {!categories.loading && !categories.error && categories.items?.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma categoria cadastrada — cadastre as categorias usadas pelo catálogo de produtos.
        </p>
      )}

      {categories.items && categories.items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {categories.items.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">
                  {category.name}
                  <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {TYPE_LABEL[category.typeId] ?? category.typeId}
                  </span>
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {productsOf(category.slug)} produto(s) · ordem {category.sort} ·{" "}
                  <span className="font-mono">{category.slug}</span>
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setForm(toForm(category));
                      setEditing(category);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
                    disabled={categories.busy}
                    onClick={() => void handleDelete(category)}
                  >
                    {categories.busy ? "Excluindo…" : "Excluir"}
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
