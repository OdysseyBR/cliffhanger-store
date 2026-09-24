"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { saveProduct } from "@/components/admin/admin-api";
import {
  Card,
  Field,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import {
  BADGE_OPTIONS,
  COVER_MOTIF_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  TYPE_CATEGORY,
  newProductDraft,
  productSlug,
} from "@/lib/product-fields";
import type { Product, ProductType, Spec, Author, Universe, Work } from "@/lib/types";

/**
 * Criador de itens (Doc Mestre 11.2 — cadastro de produtos: literatura e
 * merchandising). Rodada atual: campos base + relacionamentos + specs.
 * O card final deixa o SLOT documentado para os campos específicos por
 * tipo da próxima rodada (ISBN/editora/páginas, narrador/duração, SKU...).
 */

export interface ProductRefs {
  works: Work[];
  universes: Universe[];
  authors: Author[];
}

const NO_RELATION = { value: "", label: "— nenhuma —" };

export function ProductEditor({
  mode,
  initial,
  refs,
}: {
  mode: "create" | "edit";
  initial?: Product;
  refs: ProductRefs;
}) {
  const router = useRouter();
  const { notify } = useStore();
  const [draft, setDraft] = useState<Product>(initial ?? newProductDraft());
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [busy, setBusy] = useState(false);

  function patch(changes: Partial<Product>) {
    setDraft((prev) => ({ ...prev, ...changes }));
  }

  function handleTitle(value: string) {
    patch(slugTouched ? { title: value } : { title: value, slug: productSlug(value) });
  }

  function handleType(type: ProductType) {
    // Categoria sugerida pela seção 5.2 — o usuário pode ajustar em seguida.
    patch({ type, category: TYPE_CATEGORY[type] });
  }

  function updateSpec(index: number, key: keyof Spec, value: string) {
    patch({
      specs: draft.specs.map((spec, i) => (i === index ? { ...spec, [key]: value } : spec)),
    });
  }

  function addSpec() {
    patch({ specs: [...draft.specs, { label: "", value: "" }] });
  }

  function removeSpec(index: number) {
    patch({ specs: draft.specs.filter((_, i) => i !== index) });
  }

  function patchCover(changes: Partial<NonNullable<Product["cover"]>>) {
    patch({ cover: { bg: "#0C0014", fg: "#F8FEFF", accent: "#FDC500", motif: "farol", ...draft.cover, ...changes } });
  }

  async function handleSave() {
    const slug = productSlug(draft.slug) || productSlug(draft.title);
    if (!draft.title.trim() || !slug || draft.price < 0) {
      notify("Preencha título, slug e preço para salvar.", "error");
      return;
    }
    const id = draft.id.trim() || productSlug(`prd ${slug}`);
    if (mode === "create" && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      notify("Id inválido — use minúsculas, números e hífens.", "error");
      return;
    }

    setBusy(true);
    const result = await saveProduct({ ...draft, id, slug }, mode === "create");
    setBusy(false);
    if (result.ok) {
      notify(mode === "create" ? "Item criado" : "Item salvo", "success");
      router.push("/admin/produtos");
    } else {
      notify(result.message, "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">
            {mode === "create" ? "Novo item" : "Editar item"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Cadastro de produtos — Doc Mestre 11.2
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost px-4 py-2 text-[11px]" onClick={() => router.push("/admin/produtos")}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary px-4 py-2 text-[11px]" disabled={busy} onClick={() => void handleSave()}>
            {busy ? "Salvando…" : "Salvar item"}
          </button>
        </div>
      </div>

      <Card title="Identidade">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título">
            <TextInput value={draft.title} onChange={handleTitle} placeholder="Ex.: Valeharts III — Livro físico" />
          </Field>
          <Field label="Slug (URL)" hint="Em branco é gerado a partir do título.">
            <TextInput
              value={draft.slug}
              onChange={(value) => {
                setSlugTouched(true);
                patch({ slug: value });
              }}
              placeholder="valeharts-iii-livro-fisico"
            />
          </Field>
          <Field
            label="Id"
            hint={mode === "edit" ? "O id não muda depois de criado." : "Em branco = prd-<slug>."}
          >
            <TextInput
              value={draft.id}
              onChange={(value) => patch({ id: value })}
              placeholder="prd-minha-obra-livro"
              disabled={mode === "edit"}
            />
          </Field>
          <Field label="Categoria" hint="Sugerida pelo tipo (seção 5.2).">
            <SelectInput
              value={draft.category}
              options={PRODUCT_CATEGORY_OPTIONS}
              onChange={(value) => patch({ category: value as Product["category"] })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Comercial">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo">
            <SelectInput
              value={draft.type}
              options={PRODUCT_TYPE_OPTIONS}
              onChange={(value) => handleType(value as ProductType)}
            />
          </Field>
          <Field label="Preço (R$)">
            <NumberInput value={draft.price} onChange={(value) => patch({ price: value })} min={0} step={0.01} />
          </Field>
          <Field label={'Preço "de" (R$)'} hint="Só aparece acima do preço atual.">
            <NumberInput
              value={draft.compareAt ?? 0}
              onChange={(value) => patch({ compareAt: value > 0 ? value : undefined })}
              min={0}
              step={0.01}
            />
          </Field>
          <Field label="Badge">
            <SelectInput
              value={draft.badge ?? ""}
              options={BADGE_OPTIONS}
              onChange={(value) => patch({ badge: (value || undefined) as Product["badge"] })}
            />
          </Field>
          <Field label="Estoque">
            <NumberInput value={draft.stock} onChange={(value) => patch({ stock: value })} min={0} step={1} />
          </Field>
          <Field label="Posição em mais vendidos" hint="Menor = mais vendido.">
            <NumberInput
              value={draft.salesRank ?? 0}
              onChange={(value) => patch({ salesRank: value > 0 ? Math.round(value) : undefined })}
              min={0}
              step={1}
            />
          </Field>
          <Field label="Avaliação (0 a 5)">
            <NumberInput value={draft.rating} onChange={(value) => patch({ rating: value })} min={0} max={5} step={0.1} />
          </Field>
          <Field label="N.º de avaliações">
            <NumberInput value={draft.reviewCount} onChange={(value) => patch({ reviewCount: value })} min={0} step={1} />
          </Field>
          <Field label="Data de lançamento" hint="Usada em pré-vendas.">
            <input
              type="date"
              className="field w-full"
              value={draft.releaseDate ? draft.releaseDate.slice(0, 10) : ""}
              onChange={(event) =>
                patch({
                  releaseDate: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.digital}
            onChange={(event) => patch({ digital: event.target.checked })}
          />
          Entrega digital (vai para a biblioteca do cliente)
        </label>
      </Card>

      <Card title="Descrição">
        <TextArea value={draft.description} onChange={(value) => patch({ description: value })} rows={5} placeholder="Sinopse ou texto de venda do item." />
      </Card>

      <Card title="Relacionamentos">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Obra">
            <SelectInput
              value={draft.workId ?? ""}
              options={[NO_RELATION, ...refs.works.map((work) => ({ value: work.id, label: work.title }))]}
              onChange={(value) => patch({ workId: value || undefined })}
            />
          </Field>
          <Field label="Universo">
            <SelectInput
              value={draft.universeId ?? ""}
              options={[NO_RELATION, ...refs.universes.map((universe) => ({ value: universe.id, label: universe.name }))]}
              onChange={(value) => patch({ universeId: value || undefined })}
            />
          </Field>
          <Field label="Autor">
            <SelectInput
              value={draft.authorId ?? ""}
              options={[NO_RELATION, ...refs.authors.map((author) => ({ value: author.id, label: author.name }))]}
              onChange={(value) => patch({ authorId: value || undefined })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Especificações">
        {draft.specs.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">
            Sem especificações — ex.: páginas, peso, material, conteúdo.
          </p>
        )}
        {draft.specs.map((spec, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <div className="min-w-40 flex-1">
              <TextInput value={spec.label} onChange={(value) => updateSpec(index, "label", value)} placeholder="Rótulo (ex.: Páginas)" />
            </div>
            <div className="min-w-40 flex-1">
              <TextInput value={spec.value} onChange={(value) => updateSpec(index, "value", value)} placeholder="Valor (ex.: 320)" />
            </div>
            <button type="button" className="btn btn-ghost px-3 py-2 text-[11px]" onClick={() => removeSpec(index)}>
              Remover
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost px-4 py-2 text-[11px]" onClick={addSpec}>
          Adicionar especificação
        </button>
      </Card>

      <Card title="Capa ilustrada">
        <p className="text-sm text-[var(--text-muted)]">
          Sem capa, a loja usa o arte procedural padrão gerado do id do item.
        </p>
        {draft.cover ? (
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Fundo">
              <input type="color" className="field h-10 w-full" value={draft.cover.bg} onChange={(event) => patchCover({ bg: event.target.value })} />
            </Field>
            <Field label="Texto">
              <input type="color" className="field h-10 w-full" value={draft.cover.fg} onChange={(event) => patchCover({ fg: event.target.value })} />
            </Field>
            <Field label="Destaque">
              <input type="color" className="field h-10 w-full" value={draft.cover.accent} onChange={(event) => patchCover({ accent: event.target.value })} />
            </Field>
            <Field label="Motivo">
              <SelectInput
                value={draft.cover.motif}
                options={COVER_MOTIF_OPTIONS}
                onChange={(value) => patchCover({ motif: value as NonNullable<Product["cover"]>["motif"] })}
              />
            </Field>
            <div className="sm:col-span-4">
              <button type="button" className="btn btn-ghost px-4 py-2 text-[11px]" onClick={() => patch({ cover: undefined })}>
                Remover capa ilustrada
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => patch({ cover: { bg: "#0C0014", fg: "#F8FEFF", accent: "#FDC500", motif: "farol" } })}
            >
              Usar capa ilustrada
            </button>
          </div>
        )}
      </Card>

      <Card title="Campos específicos por tipo (11.2)">
        <p className="text-sm text-[var(--text-muted)]">
          Slot preparado para a próxima rodada: ISBN/editora/páginas/dimensões (livro físico),
          arquivo/formato/proteção (e-book), capítulos/narrador/duração (audiobook) e
          SKU/variantes/imagens (merchandising). Hoje esses dados cabem em{" "}
          <strong>Especificações</strong> acima.
        </p>
      </Card>
    </div>
  );
}
