"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ThemeBanner } from "@/components/ThemeBanner";
import { ThemeZones } from "@/components/ThemeZones";
import { ImageField } from "@/components/admin/ImageField";
import { deleteTheme, saveTheme } from "@/components/admin/admin-api";
import { Card, Field, SelectInput, TextArea, TextInput } from "@/components/admin/form-fields";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconCheck,
  IconExternal,
  IconX,
} from "@/components/Icons";
import {
  FONT_STACK_LABELS,
  HOME_SECTION_LABELS,
  HOME_SECTION_ORDER,
  THEME_KIND_LABELS,
  ZONE_PLACEMENT_LABELS,
  ZONE_TYPE_LABELS,
  themeCssVars,
} from "@/lib/theme-css";
import type {
  BorderStyleKey,
  Product,
  ThemeBanner as BannerConfig,
  ThemeHomeSection,
  ThemeKind,
  ThemeModel,
  ThemeStatus,
  ThemeZone,
  ThemeZonePlacement,
  ThemeZoneType,
} from "@/lib/types";

/**
 * Editor de modelo do Theme Engine (Fase 2 — 4.4/4.5/4.6/4.7).
 * Formulário completo: identidade, cores, banner (com upload de imagem),
 * seções, destaques, zonas novas, agendamento e preview ao vivo.
 */

const STATUS_OPTIONS: { value: ThemeStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "preview", label: "Preview" },
  { value: "publicado", label: "Publicado" },
  { value: "arquivado", label: "Arquivado" },
];

const KIND_OPTIONS = (
  Object.entries(THEME_KIND_LABELS) as [ThemeKind, string][]
).map(([value, label]) => ({ value, label }));

const FONT_OPTIONS = Object.entries(FONT_STACK_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const BORDER_OPTIONS: { value: BorderStyleKey; label: string }[] = [
  { value: "clean", label: "Clean (padrão)" },
  { value: "framed", label: "Enquadrado (borda grossa)" },
  { value: "editorial", label: "Editorial (cantos retos)" },
];

const ZONE_TYPES = (
  Object.entries(ZONE_TYPE_LABELS) as [ThemeZoneType, string][]
).map(([value, label]) => ({ value, label }));

const ZONE_PLACEMENTS = (
  Object.entries(ZONE_PLACEMENT_LABELS) as [ThemeZonePlacement, string][]
).map(([value, label]) => ({ value, label }));

/** datetime-local ↔ ISO */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function slugKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------ */
/* editor                                                              */
/* ------------------------------------------------------------------ */

export function ThemeEditor({
  theme,
  onSaved,
  onDeleted,
}: {
  theme: ThemeModel;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<ThemeModel>(theme);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productQuery, setProductQuery] = useState("");

  // catálogo para o seletor de destaques
  useEffect(() => {
    let alive = true;
    void fetch("/api/products")
      .then((res) => res.json())
      .then((data: { products?: Product[] }) => {
        if (alive) setProducts(data.products ?? []);
      })
      .catch(() => {
        if (alive) setProducts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const patchIdentity = (patch: Partial<ThemeModel["identity"]>) =>
    setDraft((d) => ({ ...d, identity: { ...d.identity, ...patch } }));

  const patchColors = (patch: Partial<ThemeModel["identity"]["colors"]>) =>
    setDraft((d) => ({
      ...d,
      identity: { ...d.identity, colors: { ...d.identity.colors, ...patch } },
    }));

  const patchBanner = (patch: Partial<BannerConfig>) =>
    setDraft((d) => ({ ...d, home: { ...d.home, banner: { ...d.home.banner, ...patch } } }));

  const patchHome = (patch: Partial<ThemeModel["home"]>) =>
    setDraft((d) => ({ ...d, home: { ...d.home, ...patch } }));

  /** seções = lista ordenada do modelo + chaves ausentes (desativadas) */
  const sectionsList: ThemeHomeSection[] = useMemo(
    () => [
      ...draft.home.sections,
      ...HOME_SECTION_ORDER.filter(
        (key) => !draft.home.sections.some((section) => section.key === key),
      ).map((key) => ({ key, enabled: false })),
    ],
    [draft.home.sections],
  );

  const toggleSection = (key: string) =>
    patchHome({
      sections: sectionsList.map((section) =>
        section.key === key ? { ...section, enabled: !section.enabled } : section,
      ),
    });

  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...sectionsList];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patchHome({ sections: next });
  };

  const addZone = () =>
    patchHome({
      zones: [
        ...draft.home.zones,
        {
          id: `zone-${Date.now().toString(36)}`,
          type: "marquee",
          enabled: true,
          placement: "after-destaques",
          title: "Nova zona",
          messages: ["Mensagem do festival"],
        },
      ],
    });

  const patchZone = (id: string, patch: Partial<ThemeZone>) =>
    patchHome({
      zones: draft.home.zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    });

  const removeZone = (id: string) =>
    patchHome({ zones: draft.home.zones.filter((zone) => zone.id !== id) });

  const toggleDestaque = (id: string) =>
    patchHome({
      destaques: draft.home.destaques.includes(id)
        ? draft.home.destaques.filter((value) => value !== id)
        : [...draft.home.destaques, id],
    });

  const onSave = async () => {
    if (!draft.name.trim() || !draft.key.trim() || !draft.home.banner.title.trim()) {
      setMessage({ ok: false, text: "Nome, chave e título do banner são obrigatórios." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const normalized: ThemeModel = { ...draft, key: slugKey(draft.key) || draft.key };
    const result = await saveTheme(normalized);
    setBusy(false);
    if (result.ok) {
      setDraft(normalized);
      setMessage({ ok: true, text: `Modelo salvo — a loja aplica em até 5 minutos.` });
      onSaved();
    } else {
      setMessage({ ok: false, text: `${result.message}` });
    }
  };

  const onDelete = async () => {
    if (draft.status !== "rascunho") return;
    if (!window.confirm(`Apagar o rascunho "${draft.name}"? Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    const result = await deleteTheme(draft.id);
    setBusy(false);
    if (result.ok) onDeleted();
    else setMessage({ ok: false, text: `${result.message}` });
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const query = productQuery.trim().toLowerCase();
    return query
      ? products.filter((product) => product.title.toLowerCase().includes(query))
      : products;
  }, [products, productQuery]);

  const banner = draft.home.banner;
  const colors = draft.identity.colors;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      {/* ------------------------------------------------ formulário */}
      <div className="space-y-5">
        {/* barra de ações */}
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/95 p-3 backdrop-blur">
          <Link
            href="/admin/temas"
            className="btn btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-[11px]"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Modelos
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {message && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs ${message.ok ? "text-emerald-300" : "text-[#e5484d]"}`}
              >
                {message.ok ? (
                  <IconCheck className="h-4 w-4" />
                ) : (
                  <IconX className="h-4 w-4" />
                )}
                {message.text}
              </span>
            )}
            {draft.status === "rascunho" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDelete()}
                className="btn btn-ghost px-4 py-2 text-[11px]"
              >
                Apagar rascunho
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSave()}
              className="btn btn-accent px-5 py-2 text-[11px]"
            >
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        <Card title="Geral">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <TextInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            </Field>
            <Field label="Chave (data-theme)" hint="minúsculas e hífens">
              <TextInput value={draft.key} onChange={(v) => setDraft({ ...draft, key: v })} />
            </Field>
            <Field label="Tipo">
              <SelectInput
                value={draft.kind}
                options={KIND_OPTIONS}
                onChange={(v) => setDraft({ ...draft, kind: v as ThemeKind })}
              />
            </Field>
            <Field label="Versão">
              <TextInput
                value={draft.version}
                onChange={(v) => setDraft({ ...draft, version: v })}
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={draft.status}
                options={STATUS_OPTIONS}
                onChange={(v) => setDraft({ ...draft, status: v as ThemeStatus })}
              />
            </Field>
          </div>
        </Card>

        <Card title="Agendamento (4.6)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Início da janela">
              <input
                type="datetime-local"
                value={toLocalInput(draft.scheduledStart)}
                onChange={(event) =>
                  setDraft({ ...draft, scheduledStart: fromLocalInput(event.target.value) })
                }
                className="field w-full"
              />
            </Field>
            <Field label="Fim da janela">
              <input
                type="datetime-local"
                value={toLocalInput(draft.scheduledEnd)}
                onChange={(event) =>
                  setDraft({ ...draft, scheduledEnd: fromLocalInput(event.target.value) })
                }
                className="field w-full"
              />
            </Field>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Com status “Publicado”, a janela decide quando o modelo fica ativo — sem novo deploy.
          </p>
        </Card>

        <Card title="Identidade">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modo">
              <SelectInput
                value={draft.identity.mode}
                options={[
                  { value: "dark", label: "Escuro (logo branca)" },
                  { value: "light", label: "Claro (logo escura)" },
                ]}
                onChange={(v) => patchIdentity({ mode: v as "dark" | "light" })}
              />
            </Field>
            <Field label="Tipografia de destaque">
              <SelectInput
                value={draft.identity.displayFont}
                options={FONT_OPTIONS}
                onChange={(v) => patchIdentity({ displayFont: v })}
              />
            </Field>
            <Field label="Raio dos cards" hint="ex.: 1.25rem">
              <TextInput
                value={draft.identity.cardRadius}
                onChange={(v) => patchIdentity({ cardRadius: v })}
              />
            </Field>
            <Field label="Estilo de borda">
              <SelectInput
                value={draft.identity.borderStyle}
                options={BORDER_OPTIONS}
                onChange={(v) => patchIdentity({ borderStyle: v as BorderStyleKey })}
              />
            </Field>
          </div>
          <Field
            label="Fundo do site (body)"
            hint="Cor ou gradiente livre — festival fora da paleta. Vazio = cor de superfície."
          >
            <TextArea
              value={draft.identity.bodyBackground ?? ""}
              onChange={(v) => patchIdentity({ bodyBackground: v })}
              rows={2}
              placeholder="radial-gradient(…), #04101f"
            />
          </Field>
        </Card>

        <Card title="Cores">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["surface", "Superfície"],
                ["surfaceRaised", "Superfície elevada"],
                ["surfaceRaised2", "Superfície elevada 2"],
                ["text", "Texto"],
                ["textMuted", "Texto suave"],
                ["brand", "Marca"],
                ["brandStrong", "Marca forte"],
                ["accent", "Destaque"],
              ] as [keyof typeof colors, string][]
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(event) => patchColors({ [key]: event.target.value })}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                    aria-label={label}
                  />
                  <TextInput
                    value={colors[key]}
                    onChange={(v) => patchColors({ [key]: v })}
                  />
                </div>
              </Field>
            ))}
            <Field label="Borda (rgba)">
              <TextInput value={colors.border} onChange={(v) => patchColors({ border: v })} />
            </Field>
            <Field label="Fundo do header (rgba)">
              <TextInput value={colors.headerBg} onChange={(v) => patchColors({ headerBg: v })} />
            </Field>
          </div>
        </Card>

        <Card title="Banner da Home (3.1)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow">
              <TextInput
                value={banner.eyebrow ?? ""}
                onChange={(v) => patchBanner({ eyebrow: v || undefined })}
              />
            </Field>
            <Field label="Título *">
              <TextInput value={banner.title} onChange={(v) => patchBanner({ title: v })} />
            </Field>
            <Field label="Segunda linha (gradiente)">
              <TextInput
                value={banner.highlight ?? ""}
                onChange={(v) => patchBanner({ highlight: v || undefined })}
              />
            </Field>
            <Field label="Contagem regressiva">
              <input
                type="datetime-local"
                value={toLocalInput(banner.countdown)}
                onChange={(event) =>
                  patchBanner({ countdown: fromLocalInput(event.target.value) ?? undefined })
                }
                className="field w-full"
              />
            </Field>
          </div>

          <Field label="Descrição">
            <TextArea
              value={banner.description ?? ""}
              onChange={(v) => patchBanner({ description: v || undefined })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA primário — texto">
              <TextInput
                value={banner.primaryCta?.label ?? ""}
                onChange={(v) =>
                  patchBanner({ primaryCta: v ? { label: v, href: banner.primaryCta?.href ?? "/" } : undefined })
                }
              />
            </Field>
            <Field label="CTA primário — link">
              <TextInput
                value={banner.primaryCta?.href ?? ""}
                onChange={(v) =>
                  patchBanner({
                    primaryCta: banner.primaryCta ? { ...banner.primaryCta, href: v } : undefined,
                  })
                }
              />
            </Field>
            <Field label="CTA secundário — texto">
              <TextInput
                value={banner.secondaryCta?.label ?? ""}
                onChange={(v) =>
                  patchBanner({
                    secondaryCta: v ? { label: v, href: banner.secondaryCta?.href ?? "/loja" } : undefined,
                  })
                }
              />
            </Field>
            <Field label="CTA secundário — link">
              <TextInput
                value={banner.secondaryCta?.href ?? ""}
                onChange={(v) =>
                  patchBanner({
                    secondaryCta: banner.secondaryCta
                      ? { ...banner.secondaryCta, href: v }
                      : undefined,
                  })
                }
              />
            </Field>
          </div>

          <ImageField
            label="Imagem do banner (upload)"
            value={banner.image ?? ""}
            onChange={(url) => patchBanner({ image: url || undefined })}
            hint="Envie sua arte — o arquivo vai para o Cloudinary e a URL é salva no modelo."
          />

          <Field label="Vídeo do banner (.mp4/.webm — Doc 3.1)">
            <TextInput
              value={banner.video ?? ""}
              onChange={(v) => patchBanner({ video: v || undefined })}
            />
          </Field>
          {banner.video && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Vídeo no quadro lateral: autoplay mudo em loop; a imagem acima vira pôster.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legenda sobre a imagem">
              <TextInput
                value={banner.imageCaption ?? ""}
                onChange={(v) => patchBanner({ imageCaption: v || undefined })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CTA da imagem — texto">
                <TextInput
                  value={banner.imageCta?.label ?? ""}
                  onChange={(v) =>
                    patchBanner({
                      imageCta: v
                        ? { label: v, href: banner.imageCta?.href ?? "/ofertas" }
                        : undefined,
                    })
                  }
                />
              </Field>
              <Field label="CTA da imagem — link">
                <TextInput
                  value={banner.imageCta?.href ?? ""}
                  onChange={(v) =>
                    patchBanner({
                      imageCta: banner.imageCta ? { ...banner.imageCta, href: v } : undefined,
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {/* stats */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Métricas do banner
            </span>
            {(banner.stats ?? []).map((stat, index) => (
              <div key={index} className="flex gap-2">
                <TextInput
                  value={stat.label}
                  onChange={(v) => {
                    const stats = [...(banner.stats ?? [])];
                    stats[index] = { ...stats[index], label: v };
                    patchBanner({ stats });
                  }}
                />
                <TextInput
                  value={stat.value}
                  onChange={(v) => {
                    const stats = [...(banner.stats ?? [])];
                    stats[index] = { ...stats[index], value: v };
                    patchBanner({ stats });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  onClick={() =>
                    patchBanner({ stats: (banner.stats ?? []).filter((_, i) => i !== index) })
                  }
                  aria-label="Remover métrica"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() =>
                patchBanner({ stats: [...(banner.stats ?? []), { label: "", value: "" }] })
              }
            >
              + Métrica
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={banner.showHeader}
              onChange={(event) => patchBanner({ showHeader: event.target.checked })}
            />
            Mostrar header na Home (desmarcar = Modo Somente Banner, 3.3)
          </label>
        </Card>

        <Card title="Seções da Home (3.6)">
          <p className="text-[11px] text-[var(--text-muted)]">
            A ordem da lista é a ordem da Home. Desmarcadas saem da página.
          </p>
          <ul className="space-y-1">
            {sectionsList.map((section, index) => (
              <li
                key={section.key}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={() => toggleSection(section.key)}
                  aria-label={HOME_SECTION_LABELS[section.key]}
                />
                <span
                  className={`flex-1 text-sm ${section.enabled ? "" : "text-[var(--text-muted)] line-through"}`}
                >
                  {HOME_SECTION_LABELS[section.key]}
                </span>
                <button
                  type="button"
                  className="px-2 text-xs text-[var(--text-muted)] hover:text-gold"
                  onClick={() => moveSection(index, -1)}
                  aria-label="Mover para cima"
                >
                  <IconArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="px-2 text-xs text-[var(--text-muted)] hover:text-gold"
                  onClick={() => moveSection(index, 1)}
                  aria-label="Mover para baixo"
                >
                  <IconArrowDown className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Destaques (3.5)">
          <p className="text-[11px] text-[var(--text-muted)]">
            Nenhum produto selecionado = seleção automática. A ordem dos cliques é a ordem de
            exibição.
            {draft.home.destaques.length > 0 &&
              ` (${draft.home.destaques.length} selecionado${draft.home.destaques.length > 1 ? "s" : ""})`}
          </p>
          <input
            type="search"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="Buscar produto pelo título…"
            className="field w-full"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {products === null && (
              <p className="text-xs text-[var(--text-muted)]">Carregando produtos…</p>
            )}
            {products !== null && filteredProducts.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">Nenhum produto encontrado.</p>
            )}
            {filteredProducts.map((product) => {
              const selected = draft.home.destaques.includes(product.id);
              return (
                <label
                  key={product.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                    selected
                      ? "border-gold/60 bg-gold/10"
                      : "border-[var(--border)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleDestaque(product.id)}
                  />
                  <span className="flex-1 truncate">{product.title}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="Zonas novas (festivais)">
          <p className="text-[11px] text-[var(--text-muted)]">
            Blocos extras que fogem do padrão da Home — faixa rolante, grades, categorias,
            editorial e contagem. Faixa rolante, categorias e grades quebram a arquitetura fixa.
          </p>

          {draft.home.zones.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Nenhuma zona — este modelo usa só as seções oficiais.
            </p>
          )}

          {draft.home.zones.map((zone) => (
            <div
              key={zone.id}
              className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/50 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label="Tipo">
                  <SelectInput
                    value={zone.type}
                    options={ZONE_TYPES}
                    onChange={(v) => patchZone(zone.id, { type: v as ThemeZoneType })}
                  />
                </Field>
                <Field label="Posição na Home">
                  <SelectInput
                    value={zone.placement}
                    options={ZONE_PLACEMENTS}
                    onChange={(v) => patchZone(zone.id, { placement: v as ThemeZonePlacement })}
                  />
                </Field>
                <div className="flex gap-2 pb-1">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={zone.enabled}
                      onChange={(event) => patchZone(zone.id, { enabled: event.target.checked })}
                    />
                    ativa
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-[11px]"
                    onClick={() => removeZone(zone.id)}
                    aria-label="Remover zona"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Título">
                  <TextInput
                    value={zone.title ?? ""}
                    onChange={(v) => patchZone(zone.id, { title: v || undefined })}
                  />
                </Field>
                <Field label="Subtítulo">
                  <TextInput
                    value={zone.subtitle ?? ""}
                    onChange={(v) => patchZone(zone.id, { subtitle: v || undefined })}
                  />
                </Field>
              </div>

              {/* marquee */}
              {zone.type === "marquee" && (
                <Field label="Mensagens (uma por linha)">
                  <TextArea
                    value={(zone.messages ?? []).join("\n")}
                    onChange={(v) =>
                      patchZone(zone.id, {
                        messages: v.split("\n").map((line) => line.trim()).filter(Boolean),
                      })
                    }
                    rows={3}
                    placeholder={"Frete grátis acima de R$ 199\nAté 40% off"}
                  />
                </Field>
              )}

              {/* promo-grid / category-band */}
              {(zone.type === "promo-grid" || zone.type === "category-band") && (
                <div className="space-y-2">
                  {(zone.items ?? []).map((item, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-lg border border-[var(--border)] p-3"
                    >
                      <div className="flex gap-2">
                        <TextInput
                          value={item.title}
                          onChange={(v) => {
                            const items = [...(zone.items ?? [])];
                            items[index] = { ...items[index], title: v };
                            patchZone(zone.id, { items });
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost px-3 py-2 text-[11px]"
                          onClick={() =>
                            patchZone(zone.id, {
                              items: (zone.items ?? []).filter((_, i) => i !== index),
                            })
                          }
                          aria-label="Remover item"
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <TextInput
                          value={item.subtitle ?? ""}
                          placeholder="Subtítulo"
                          onChange={(v) => {
                            const items = [...(zone.items ?? [])];
                            items[index] = { ...items[index], subtitle: v || undefined };
                            patchZone(zone.id, { items });
                          }}
                        />
                        <TextInput
                          value={item.href ?? ""}
                          placeholder="Link (/…)"
                          onChange={(v) => {
                            const items = [...(zone.items ?? [])];
                            items[index] = { ...items[index], href: v || undefined };
                            patchZone(zone.id, { items });
                          }}
                        />
                      </div>
                      {zone.type === "promo-grid" && (
                        <ImageField
                          label="Imagem do card (opcional)"
                          value={item.image ?? ""}
                          onChange={(url) => {
                            const items = [...(zone.items ?? [])];
                            items[index] = { ...items[index], image: url || undefined };
                            patchZone(zone.id, { items });
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost px-4 py-2 text-[11px]"
                    onClick={() =>
                      patchZone(zone.id, {
                        items: [...(zone.items ?? []), { title: "Novo item" }],
                      })
                    }
                  >
                    + Item
                  </button>
                </div>
              )}

              {/* editorial */}
              {zone.type === "editorial" && (
                <>
                  <Field label="Texto">
                    <TextArea
                      value={zone.body ?? ""}
                      onChange={(v) => patchZone(zone.id, { body: v || undefined })}
                    />
                  </Field>
                  <ImageField
                    label="Imagem do bloco (opcional)"
                    value={zone.image ?? ""}
                    onChange={(url) => patchZone(zone.id, { image: url || undefined })}
                  />
                </>
              )}

              {/* countdown */}
              {zone.type === "countdown" && (
                <Field label="Data/hora da contagem">
                  <input
                    type="datetime-local"
                    value={toLocalInput(zone.countdown)}
                    onChange={(event) =>
                      patchZone(zone.id, {
                        countdown: fromLocalInput(event.target.value) ?? undefined,
                      })
                    }
                    className="field w-full"
                  />
                </Field>
              )}

              {/* CTA (editorial/countdown) */}
              {(zone.type === "editorial" || zone.type === "countdown") && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="CTA — texto">
                    <TextInput
                      value={zone.cta?.label ?? ""}
                      onChange={(v) =>
                        patchZone(zone.id, {
                          cta: v ? { label: v, href: zone.cta?.href ?? "/loja" } : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="CTA — link">
                    <TextInput
                      value={zone.cta?.href ?? ""}
                      onChange={(v) =>
                        patchZone(zone.id, {
                          cta: zone.cta ? { ...zone.cta, href: v } : undefined,
                        })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={addZone} className="btn btn-ghost px-4 py-2 text-[11px]">
            + Adicionar zona
          </button>
        </Card>
      </div>

      {/* ------------------------------------------------ preview */}
      <div className="lg:sticky lg:top-24">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-display text-2xl text-gold">Preview ao vivo</p>
          <Link
            href="/"
            className="btn btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-[11px]"
          >
            Ver a loja
            <IconExternal className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div
          className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-2xl"
          style={themeCssVars(draft) as CSSProperties}
        >
          <div
            style={{ background: "var(--body-bg)", color: "var(--text)" }}
            className="space-y-2"
          >
            <ThemeBanner banner={banner} />
            <div className="px-4 pb-4">
              {draft.home.zones
                .filter((zone) => zone.enabled)
                .map((zone) => (
                  <ThemeZones key={zone.id} zones={[zone]} placement={zone.placement} />
                ))}
              <div className="card p-4">
                <p className="text-display text-xl">Seção de exemplo</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  Cards, tipografia e cores herdam do modelo em tempo real.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="btn btn-accent px-4 py-2 text-[11px]">Botão destaque</span>
                  <span className="btn btn-ghost px-4 py-2 text-[11px]">Secundário</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Este preview é local. A Home publicada só muda após salvar (cache de 5 min).
        </p>
      </div>
    </div>
  );
}
