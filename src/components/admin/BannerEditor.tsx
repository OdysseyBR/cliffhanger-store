"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { ImageField } from "@/components/admin/ImageField";
import { saveBanner } from "@/components/admin/admin-api";
import {
  Card,
  Field,
  NumberInput,
  SelectInput,
  TextInput,
} from "@/components/admin/form-fields";
import {
  BANNER_DESTINATION_OPTIONS,
  bannerHref,
  datetimeToInput,
  inputToDatetime,
  newBannerDraft,
} from "@/lib/banner-fields";
import type { Banner, BannerDestinationType, Product, Work } from "@/lib/types";

/**
 * Formulário do módulo Banners (Documento de Correção §5): arte final única
 * por upload — sem construtor e sem camadas (título/CTA/fundo separados).
 * O painel controla apenas exibição, destino, ativação, ordenação e
 * agendamento.
 */
export function BannerEditor({
  initial,
  products,
  works,
  onSaved,
  onCancel,
}: {
  initial: Banner | null;
  products: Product[];
  works: Work[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { notify } = useStore();
  const [draft, setDraft] = useState<Banner>(initial ?? newBannerDraft());
  const [busy, setBusy] = useState(false);
  const mode = initial ? "edit" : "create";

  const patch = (partial: Partial<Banner>) =>
    setDraft((current) => ({ ...current, ...partial }));

  function changeDestinationType(value: string) {
    patch({
      destinationType: value as BannerDestinationType,
      destinationValue: "",
    });
  }

  async function handleSave() {
    const name = draft.name.trim();
    const alt = draft.alt.trim();
    const value = draft.destinationValue.trim();

    if (!name) {
      notify("Dê um nome interno ao banner.", "error");
      return;
    }
    if (!draft.image.trim()) {
      notify("Envie a arte final — o banner é uma imagem única (§5).", "error");
      return;
    }
    if (!alt) {
      notify("Informe o texto alternativo da arte (acessibilidade §25).", "error");
      return;
    }
    if (draft.destinationType !== "colecao" && draft.destinationType !== "campanha" && !value) {
      notify("Informe o destino do clique.", "error");
      return;
    }
    if (
      (draft.destinationType === "pagina" || draft.destinationType === "externo") &&
      !(draft.destinationType === "externo" ? /^https?:\/\//i.test(value) : value.startsWith("/"))
    ) {
      notify(
        draft.destinationType === "externo"
          ? "O destino externo precisa começar com http:// ou https://."
          : "O destino da página precisa começar com /.",
        "error",
      );
      return;
    }
    if (
      (draft.destinationType === "produto" ||
        draft.destinationType === "obra" ||
        draft.destinationType === "lancamento") &&
      /[\s/]/.test(value)
    ) {
      notify("Use apenas o slug do destino (sem espaços e sem barra).", "error");
      return;
    }
    if (draft.startsAt && draft.endsAt && Date.parse(draft.startsAt) >= Date.parse(draft.endsAt)) {
      notify("O agendamento precisa terminar depois do início.", "error");
      return;
    }

    setBusy(true);
    const result = await saveBanner({ ...draft, name, alt, destinationValue: value }, mode === "create");
    setBusy(false);
    if (result.ok) {
      notify(mode === "create" ? "Banner criado" : "Banner salvo", "success");
      onSaved();
    } else {
      notify(result.message, "error");
    }
  }

  function destinationInput(): React.ReactNode {
    const value = draft.destinationValue;
    switch (draft.destinationType) {
      case "produto": {
        const options = products.map((product) => ({ value: product.slug, label: product.title }));
        if (value && !options.some((option) => option.value === value)) {
          options.unshift({ value, label: value });
        }
        return <SelectInput value={value} options={options} onChange={(v) => patch({ destinationValue: v })} />;
      }
      case "obra": {
        const options = works.map((work) => ({ value: work.slug, label: work.title }));
        if (value && !options.some((option) => option.value === value)) {
          options.unshift({ value, label: value });
        }
        return <SelectInput value={value} options={options} onChange={(v) => patch({ destinationValue: v })} />;
      }
      case "colecao":
        return (
          <TextInput
            value={value}
            onChange={(v) => patch({ destinationValue: v })}
            placeholder="id da coleção (opcional — o clique abre /colecionaveis)"
          />
        );
      case "lancamento":
        return (
          <TextInput
            value={value}
            onChange={(v) => patch({ destinationValue: v })}
            placeholder="slug da página, ex.: valeharts-iii-a-tregua-das-espadas"
          />
        );
      case "campanha":
        return (
          <TextInput
            value={value}
            onChange={(v) => patch({ destinationValue: v })}
            placeholder="/ofertas (padrão)"
          />
        );
      case "pagina":
        return (
          <TextInput
            value={value}
            onChange={(v) => patch({ destinationValue: v })}
            placeholder="/lancamentos"
          />
        );
      case "externo":
        return (
          <TextInput
            value={value}
            onChange={(v) => patch({ destinationValue: v })}
            placeholder="https://…"
          />
        );
    }
  }

  const showPreview =
    ["colecao", "campanha"].includes(draft.destinationType) || Boolean(draft.destinationValue.trim());

  return (
    <div className="space-y-5">
      <Card title="Arte final (imagem única)">
        <Field label="Nome interno">
          <TextInput
            value={draft.name}
            onChange={(v) => patch({ name: v })}
            placeholder="Ex.: Pré-venda Valeharts III"
          />
        </Field>

        <ImageField
          label="Arte do banner"
          value={draft.image}
          onChange={(url) => patch({ image: url })}
          hint="Envie a arte pronta — o site não monta camadas de título, CTA ou fundo (§5)."
        />

        <ImageField
          label="Versão mobile (opcional)"
          value={draft.imageMobile ?? ""}
          onChange={(url) => patch({ imageMobile: url })}
          hint="Usada em telas pequenas quando a arte exigir uma versão específica."
        />

        <Field label="Texto alternativo" hint="Descreve a arte para leitores de tela (§25).">
          <TextInput
            value={draft.alt}
            onChange={(v) => patch({ alt: v })}
            placeholder="Ex.: Valeharts III — pré-venda aberta com envio em 05/12/2026"
          />
        </Field>
      </Card>

      <Card title="Destino e exibição">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Destino ao clicar">
            <SelectInput
              value={draft.destinationType}
              options={BANNER_DESTINATION_OPTIONS}
              onChange={changeDestinationType}
            />
          </Field>
          <Field label="Alvo do destino">{destinationInput()}</Field>
        </div>

        {showPreview && (
          <p className="text-xs text-[var(--text-muted)]">
            Link: <span className="text-gold">{bannerHref(draft)}</span>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ordem de exibição" hint="Menor número aparece primeiro.">
            <NumberInput value={draft.order} onChange={(v) => patch({ order: v })} min={0} step={1} />
          </Field>
          <Field label="Agendamento — início" hint="Vazio = imediato.">
            <input
              type="datetime-local"
              value={datetimeToInput(draft.startsAt)}
              onChange={(event) => patch({ startsAt: inputToDatetime(event.target.value) })}
              className="field w-full"
            />
          </Field>
          <Field label="Agendamento — fim" hint="Vazio = sem término.">
            <input
              type="datetime-local"
              value={datetimeToInput(draft.endsAt)}
              onChange={(event) => patch({ endsAt: inputToDatetime(event.target.value) })}
              className="field w-full"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => patch({ active: event.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.fullscreen}
              onChange={(event) => patch({ fullscreen: event.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span title="A arte ocupa toda a viewport (§5).">Fullscreen</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.showHeader}
              onChange={(event) => patch({ showHeader: event.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span title="Desmarcar = Modo Somente Banner (§3).">Exibir header na Home</span>
          </label>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          Desmarcar &quot;Exibir header&quot; ativa o Modo Somente Banner (§3): o header é removido por
          completo. Com nenhum banner ativo, a loja exibe o banner padrão.
        </p>
      </Card>

      <div className="flex gap-3">
        <button
          type="button"
          className="btn btn-accent px-5 py-2 text-xs"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? "Salvando…" : "Salvar banner"}
        </button>
        <button type="button" className="btn btn-ghost px-5 py-2 text-xs" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
