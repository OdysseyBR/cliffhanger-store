"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminBanners } from "@/components/admin/useAdminBanners";
import { useAdminPromotions } from "@/components/admin/useAdminMarketing";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { fetchCatalogItems, fetchCoupons } from "@/components/admin/admin-api";
import {
  Card,
  DateTimeInput,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import {
  BLANK_PROMOTION_FORM,
  promotionPhase,
  sanitizePromotionInput,
  toPromotionForm,
  type PromotionForm,
} from "@/lib/marketing-fields";
import type { Collection, Coupon, Product, Promotion, PromotionPhase } from "@/lib/types";

/**
 * §12/§16 — Promoções: campanhas que combinam produtos, coleção, cupom,
 * banner e período. O desconto continua sendo o do cupom/`compareAt`
 * (/ofertas); aqui se organiza e agenda a campanha, com a fase derivada
 * da janela (ativa/agendada/expirada/inativa).
 */

const PHASE_TONE: Record<PromotionPhase, string> = {
  ativa: "border-gold/50 bg-gold/10 text-gold",
  agendada: "border-violet-soft/50 text-violet-soft",
  expirada: "border-[var(--border)] text-[var(--text-muted)]",
  inativa: "border-[#e5484d]/50 text-[#e5484d]",
};

const PHASE_LABEL: Record<PromotionPhase, string> = {
  ativa: "ativa",
  agendada: "agendada",
  expirada: "expirada",
  inativa: "inativa",
};

function when(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
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

export default function AdminPromotionsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const promotions = useAdminPromotions();
  const { products } = useAdminProducts();
  const { banners } = useAdminBanners();

  const [editing, setEditing] = useState<Promotion | "novo" | null>(null);
  const [form, setForm] = useState<PromotionForm>(BLANK_PROMOTION_FORM);
  const [productFilter, setProductFilter] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [cols, coups] = await Promise.all([
        fetchCatalogItems<Collection>("collections"),
        fetchCoupons(),
      ]);
      if (cols.ok) setCollections(cols.data.items ?? []);
      if (coups.ok) setCoupons(coups.data.coupons ?? []);
    })();
  }, [user]);

  const set = <K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const existing = editing && editing !== "novo" ? editing : null;
    const parsed = sanitizePromotionInput(form, existing);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await promotions.save(parsed.item, editing === "novo");
    if (result.ok) {
      notify(
        editing === "novo"
          ? `Campanha “${parsed.item.title}” criada.`
          : `Campanha “${parsed.item.title}” atualizada.`,
        "success",
      );
      setEditing(null);
      setForm(BLANK_PROMOTION_FORM);
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (promotion: Promotion) => {
    if (!window.confirm(`Excluir a campanha “${promotion.title}”? Os produtos e o cupom continuam existindo.`)) {
      return;
    }
    setBusyId(promotion.id);
    const result = await promotions.remove(promotion.id);
    setBusyId(null);
    if (result.ok) notify("Campanha excluída.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar as promoções." />;
  }

  const allowed = roleLoading || can("promotions.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">promotions.view</code> — campanhas ficam com os papéis
          Comercial, Marketing e Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("promotions.edit");
  const items = promotions.items ?? [];
  const allProducts = products ?? [];
  const allBanners = banners ?? [];

  const visibleProducts = allProducts.filter((product) =>
    product.title.toLowerCase().includes(productFilter.trim().toLowerCase()),
  );

  const totals = {
    campaigns: items.length,
    active: items.filter((item) => promotionPhase(item) === "ativa").length,
    scheduled: items.filter((item) => promotionPhase(item) === "agendada").length,
    products: items.reduce((sum, item) => sum + item.productIds.length, 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Promoções</p>
          <p className="text-xs text-[var(--text-muted)]">
            Campanhas com produtos, coleção, cupom, banner e período (§16)
            {promotions.items ? ` · ${totals.campaigns} campanha(s)` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setEditing("novo");
              setForm(BLANK_PROMOTION_FORM);
            }}
          >
            Nova campanha
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Campanhas
          </p>
          <p className="text-lg font-bold">{totals.campaigns}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Ativas agora
          </p>
          <p className="text-lg font-bold text-gold">{totals.active}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Agendadas
          </p>
          <p className="text-lg font-bold">{totals.scheduled}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Produtos em campanha
          </p>
          <p className="text-lg font-bold">{totals.products}</p>
        </div>
      </div>

      {editing && (
        <Card title={editing === "novo" ? "Nova campanha" : `Editar — ${form.title || "sem título"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput value={form.title} placeholder="Ex.: Winter Fest" onChange={(v) => set("title", v)} />
            </Field>
            <Field label="Descrição">
              <TextArea value={form.description} rows={2} placeholder="Chamada da campanha." onChange={(v) => set("description", v)} />
            </Field>
            <Field label="Início (vazio = já começou)" hint="Define a fase agendada/ativa.">
              <DateTimeInput value={form.startsAt} onChange={(v) => set("startsAt", v)} />
            </Field>
            <Field label="Término (vazio = sem fim)" hint="Define a fase expirada.">
              <DateTimeInput value={form.endsAt} onChange={(v) => set("endsAt", v)} />
            </Field>
            <Field label="Coleção em destaque (opcional)">
              <SelectInput
                value={form.collectionId}
                options={[
                  { value: "", label: "Nenhuma" },
                  ...collections.map((collection) => ({ value: collection.id, label: collection.title })),
                ]}
                onChange={(v) => set("collectionId", v)}
              />
            </Field>
            <Field label="Cupom da campanha (opcional)" hint="Precisa existir em Cupons.">
              <SelectInput
                value={form.couponCode}
                options={[
                  { value: "", label: "Nenhum" },
                  ...coupons.map((coupon) => ({ value: coupon.code, label: coupon.code })),
                ]}
                onChange={(v) => set("couponCode", v)}
              />
            </Field>
            <Field label="Banner da campanha (opcional)" hint="Precisa existir em Banners.">
              <SelectInput
                value={form.bannerId}
                options={[
                  { value: "", label: "Nenhum" },
                  ...allBanners.map((banner) => ({ value: banner.id, label: banner.name })),
                ]}
                onChange={(v) => set("bannerId", v)}
              />
            </Field>
            <div className="flex items-end pb-1 text-xs text-[var(--text-muted)]">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => set("active", event.target.checked)}
                />
                Campanha ativa (desligar pausa sem apagar)
              </label>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Produtos da campanha ({form.productIds.length})
              </p>
              <div className="w-64">
                <TextInput value={productFilter} placeholder="Filtrar produtos" onChange={setProductFilter} />
              </div>
            </div>

            <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product: Product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] p-2 text-xs hover:bg-[var(--surface-raised)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.productIds.includes(product.id)}
                    onChange={(event) =>
                      set(
                        "productIds",
                        event.target.checked
                          ? [...form.productIds, product.id]
                          : form.productIds.filter((id) => id !== product.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-[var(--text)]">{product.title}</span>
                    <span className="text-[var(--text-muted)]">
                      R$ {Number(product.price ?? 0).toFixed(2)}
                    </span>
                  </span>
                </label>
              ))}
              {visibleProducts.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">Nenhum produto no filtro.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={promotions.busy}
              onClick={() => void handleSave()}
            >
              {promotions.busy ? "Gravando…" : "Salvar campanha"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing(null);
                setForm(BLANK_PROMOTION_FORM);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {promotions.loading && <p className="text-sm text-[var(--text-muted)]">Carregando promoções…</p>}
      {promotions.error && <p className="text-sm text-[#e5484d]">{promotions.error}</p>}

      {!promotions.loading && !promotions.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma campanha cadastrada — crie a primeira com o botão “Nova campanha”.
        </p>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {items.map((promotion) => {
            const phase = promotionPhase(promotion);
            return (
              <div key={promotion.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gold">{promotion.title}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {when(promotion.startsAt)} → {when(promotion.endsAt)} ·{" "}
                    {promotion.productIds.length} produto(s)
                    {promotion.couponCode ? ` · cupom ${promotion.couponCode}` : ""}
                    {promotion.collectionId ? ` · coleção ${promotion.collectionId}` : ""}
                    {promotion.bannerId ? ` · banner ${promotion.bannerId}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Label tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Label>
                    {promotion.couponCode && <Label>cupom</Label>}
                    {promotion.bannerId && <Label>banner</Label>}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      onClick={() => {
                        setEditing(promotion);
                        setForm(toPromotionForm(promotion));
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-2 text-[11px]"
                      disabled={busyId === promotion.id}
                      onClick={() => void handleRemove(promotion)}
                    >
                      {busyId === promotion.id ? "Excluindo…" : "Excluir"}
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
