"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import {
  deleteCoupon,
  fetchCoupons,
  saveCoupon,
  type AdminCoupon,
} from "@/components/admin/admin-api";
import { sanitizeCoupon } from "@/lib/coupons";
import type { Coupon } from "@/lib/types";

/**
 * Módulo Cupons do painel (Documento de Correção §12; §17 — checkout).
 * Percentual ou valor fixo, mínimo, janela de validade e limite de usos;
 * a validação e o consumo acontecem no servidor (`coupons` + pedidos).
 */

interface FormState {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minSubtotal: string;
  description: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  active: boolean;
}

const BLANK: FormState = {
  code: "",
  type: "percent",
  value: "",
  minSubtotal: "",
  description: "",
  startsAt: "",
  endsAt: "",
  maxUses: "",
  active: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatWindow(coupon: AdminCoupon): string {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR") : "…";
  if (!coupon.startsAt && !coupon.endsAt) return "Sem prazo";
  return `${fmt(coupon.startsAt)} → ${fmt(coupon.endsAt)}`;
}

export default function AdminCouponsPage() {
  const { user, notify } = useStore();
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Coupon | "novo" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchCoupons();
    setLoading(false);
    if (result.ok) {
      setCoupons(result.data.coupons);
      setError(null);
    } else {
      setCoupons(null);
      setError(result.message);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // defere para um tick — setState dentro do corpo do efeito é proibido
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [user, load]);

  const openNew = () => {
    setForm(BLANK);
    setEditing("novo");
  };

  const openEdit = (coupon: AdminCoupon) => {
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minSubtotal: coupon.minSubtotal ? String(coupon.minSubtotal) : "",
      description: coupon.description ?? "",
      startsAt: toLocalInput(coupon.startsAt),
      endsAt: toLocalInput(coupon.endsAt),
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
      active: coupon.active,
    });
    setEditing(coupon);
  };

  const handleSave = async () => {
    const existing = editing !== "novo" && editing ? editing : null;
    const draft: Coupon = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minSubtotal: form.minSubtotal ? Number(form.minSubtotal) : 0,
      description: form.description.trim(),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      maxUses: form.maxUses ? Math.max(1, Math.floor(Number(form.maxUses))) : null,
      usedCount: existing?.usedCount ?? 0,
      active: form.active,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const clean = sanitizeCoupon(draft);
    if (!clean) {
      notify(
        "Dados inválidos: código de 3-24 caracteres (A-Z, 0-9, _ ou -), valor positivo e percentual até 100.",
        "error",
      );
      return;
    }

    setBusy(true);
    const result = await saveCoupon(clean, editing === "novo");
    setBusy(false);
    if (result.ok) {
      notify(editing === "novo" ? "Cupom criado!" : "Cupom atualizado!", "success");
      setEditing(null);
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  const handleToggle = async (coupon: AdminCoupon) => {
    setBusy(true);
    const result = await saveCoupon(
      { ...coupon, active: !coupon.active, updatedAt: new Date().toISOString() },
      false,
    );
    setBusy(false);
    if (result.ok) {
      notify(coupon.active ? "Cupom desativado" : "Cupom ativado", "success");
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  const handleDelete = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Excluir o cupom ${coupon.code}?`)) return;
    setBusy(true);
    const result = await deleteCoupon(coupon.code);
    setBusy(false);
    if (result.ok) {
      notify("Cupom excluído", "success");
      void load();
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) return <AdminLogin note="Entre com a conta administradora para gerenciar os cupons." />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Cupons</p>
          <p className="text-xs text-[var(--text-muted)]">
            Desconto percentual ou fixo com mínimo, prazo e limite de usos — validados no
            checkout e no servidor do pedido (§17/§12)
            {coupons ? ` · ${coupons.length} cadastrados` : ""}
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={openNew}
          >
            Novo cupom
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="card space-y-4 p-5">
          <p className="text-display text-xl">
            {editing === "novo" ? "Novo cupom" : `Editar ${editing.code}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Código
              </span>
              <input
                className="field font-mono uppercase"
                placeholder="EX.: BRISA10"
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                disabled={editing !== "novo"}
                maxLength={24}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Tipo
              </span>
              <select
                className="field"
                value={form.type}
                onChange={(e) => set("type", e.target.value as FormState["type"])}
              >
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {form.type === "percent" ? "Percentual" : "Valor (R$)"}
              </span>
              <input
                className="field"
                type="number"
                min={0}
                step="0.01"
                placeholder={form.type === "percent" ? "10" : "15"}
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Subtotal mínimo (R$)
              </span>
              <input
                className="field"
                type="number"
                min={0}
                step="0.01"
                placeholder="Opcional"
                value={form.minSubtotal}
                onChange={(e) => set("minSubtotal", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Limite de usos
              </span>
              <input
                className="field"
                type="number"
                min={1}
                step="1"
                placeholder="Ilimitado"
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
              />
              Ativo
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Válido desde
              </span>
              <input
                className="field"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Válido até
              </span>
              <input
                className="field"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Descrição (aparece no checkout)
              </span>
              <input
                className="field"
                placeholder="Ex.: 10% acima de R$ 150"
                value={form.description}
                maxLength={120}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              {busy ? "Salvando…" : "Salvar cupom"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando cupons…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {!loading && !error && coupons && coupons.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum cupom criado — o checkout ainda não concede descontos.
        </p>
      )}

      {coupons?.map((coupon) => (
        <div key={coupon.code} className="card flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono font-bold text-gold">{coupon.code}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {coupon.type === "percent"
                ? `${coupon.value}% de desconto`
                : `${coupon.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de desconto`}
              {coupon.minSubtotal > 0
                ? ` · a partir de ${coupon.minSubtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                : ""}
              {" · "}
              {formatWindow(coupon)}
              {" · "}
              {coupon.usedCount}
              {coupon.maxUses != null ? ` de ${coupon.maxUses}` : " usos"} ·{" "}
              {coupon.description || "sem descrição"}
            </p>
          </div>
          <span
            className={
              coupon.active
                ? "shrink-0 rounded-full bg-gold px-3 py-1 text-[10px] font-extrabold text-ink"
                : "shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-bold text-[var(--text-muted)]"
            }
          >
            {coupon.active ? "ATIVO" : "INATIVO"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-[11px]"
              onClick={() => openEdit(coupon)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-[11px]"
              disabled={busy}
              onClick={() => void handleToggle(coupon)}
            >
              {busy ? "Salvando…" : coupon.active ? "Desativar" : "Ativar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
              disabled={busy}
              onClick={() => void handleDelete(coupon)}
            >
              {busy ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
