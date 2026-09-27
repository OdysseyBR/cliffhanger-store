"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminHome } from "@/components/admin/useAdminContent";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { HOME_SECTION_LABELS, HOME_SECTION_ORDER } from "@/lib/theme-css";
import { Card, TextInput } from "@/components/admin/form-fields";
import { sanitizeHomeInput, toHomeForm } from "@/lib/content-fields";
import type { HomeSectionKey, Product, ThemeHomeSection } from "@/lib/types";

/**
 * §12/§3 — Home: curadoria da página (Destaques + ordem/habilitação das
 * seções) aplicada sobre o padrão visual ativo. Vazio = automático do
 * tema; preenchido = o painel assume. Não edita temas (§2: sem módulo de
 * Theme Engine).
 */

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

export default function AdminHomePage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const home = useAdminHome();
  const { products } = useAdminProducts();

  const [destaques, setDestaques] = useState<string[]>([]);
  const [sections, setSections] = useState<ThemeHomeSection[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [productFilter, setProductFilter] = useState("");

  useEffect(() => {
    if (home.override !== undefined && !initialized) {
      const timer = window.setTimeout(() => {
        const current = home.override;
        if (current === undefined) return;
        const form = toHomeForm(current);
        setDestaques(form.destaques);
        setSections(form.sections);
        setInitialized(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [home.override, initialized]);

  const toggleProduct = (id: string) =>
    setDestaques((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id].slice(0, 10),
    );

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleSection = (index: number) =>
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, enabled: !section.enabled } : section)),
    );

  const resetSections = () =>
    setSections(HOME_SECTION_ORDER.map((key) => ({ key, enabled: true })));

  const handleSave = async () => {
    const parsed = sanitizeHomeInput({ destaques, sections });
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await home.save(parsed.item);
    if (result.ok) notify("Curadoria da home atualizada — a loja reflete em até 5 minutos.", "success");
    else notify(result.message, "error");
  };

  const handleClear = async () => {
    if (!window.confirm("Limpar a curadoria? A home volta ao automático do tema.")) return;
    const result = await home.save({ destaques: [], sections: [] });
    if (result.ok) {
      setDestaques([]);
      setSections([]);
      notify("Curadoria limpa — home no automático do tema.", "success");
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para compor a home." />;
  }

  const allowed = roleLoading || can("home.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">home.view</code> — a home fica com Editorial (leitura),
          Marketing e Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("home.edit");
  const allProducts = products ?? [];
  const byId = new Map(allProducts.map((product) => [product.id, product]));

  const curated = destaques
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));

  const visibleProducts = allProducts.filter((product) =>
    product.title.toLowerCase().includes(productFilter.trim().toLowerCase()),
  );

  const usingOverride = (home.override?.destaques?.length ?? 0) > 0 || (home.override?.sections?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Home</p>
          <p className="text-xs text-[var(--text-muted)]">
            Destaques e ordem das seções sobre o padrão ativo — vazio = automático do tema (§3)
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              disabled={home.busy}
              onClick={() => void handleClear()}
            >
              Voltar ao automático
            </button>
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={home.busy}
              onClick={() => void handleSave()}
            >
              {home.busy ? "Gravando…" : "Salvar curadoria"}
            </button>
          </div>
        )}
      </div>

      {home.loading && <p className="text-sm text-[var(--text-muted)]">Carregando home…</p>}
      {home.error && <p className="text-sm text-[#e5484d]">{home.error}</p>}

      {!home.loading && !home.error && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {usingOverride ? (
              <Label tone="border-gold/50 bg-gold/10 text-gold">curadoria do painel ativa</Label>
            ) : (
              <Label>automático do tema</Label>
            )}
            {home.override?.updatedAt && (
              <Label>
                atualizada em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Sao_Paulo",
                }).format(new Date(home.override.updatedAt))}
              </Label>
            )}
          </div>

          <Card title={`Destaques — side scroll (${destaques.length} de 10)`}>
            {curated.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {curated.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleProduct(product.id)}
                    className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[11px] text-gold"
                    title="Remover dos destaques"
                  >
                    {product.title} ×
                  </button>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Vazio = a loja monta sozinha (mais vendidos + lançamentos).
              </p>
            )}

            <div className="mb-2 w-64">
              <TextInput value={productFilter} placeholder="Filtrar produtos" onChange={setProductFilter} />
            </div>
            <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] p-2 text-xs hover:bg-[var(--surface-raised)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled={!canEdit}
                    checked={destaques.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-[var(--text)]">{product.title}</span>
                    <span className="text-[var(--text-muted)]">R$ {Number(product.price ?? 0).toFixed(2)}</span>
                  </span>
                </label>
              ))}
              {visibleProducts.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Nenhum produto no filtro.</p>
              )}
            </div>
          </Card>

          <Card title="Seções — ordem e visibilidade (§3.6)">
            {sections.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Vazio = ordem oficial do tema, tudo visível. Monte a sua ou parta do padrão:
                </p>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost px-4 py-2 text-[11px]"
                    onClick={resetSections}
                  >
                    Partir da ordem oficial
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {sections.map((section, index) => (
                  <div
                    key={section.key}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2"
                  >
                    <span className="min-w-0 flex-1 text-xs font-bold">
                      {index + 1}. {HOME_SECTION_LABELS[section.key as HomeSectionKey]}
                    </span>
                    <Label tone={section.enabled ? "border-gold/50 bg-gold/10 text-gold" : undefined}>
                      {section.enabled ? "visível" : "oculta"}
                    </Label>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost px-2 py-1 text-[11px]"
                          disabled={index === 0}
                          onClick={() => moveSection(index, -1)}
                          aria-label={`Subir ${section.key}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost px-2 py-1 text-[11px]"
                          disabled={index === sections.length - 1}
                          onClick={() => moveSection(index, 1)}
                          aria-label={`Descer ${section.key}`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost px-2 py-1 text-[11px]"
                          onClick={() => toggleSection(index)}
                        >
                          {section.enabled ? "Ocultar" : "Exibir"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost px-4 py-2 text-[11px]"
                    onClick={() => setSections([])}
                  >
                    Limpar (voltar ao automático)
                  </button>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
