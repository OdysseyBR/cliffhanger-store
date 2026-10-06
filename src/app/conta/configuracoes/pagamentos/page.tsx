"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { Card, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/form-fields";
import type { PaymentMethodRef } from "@/lib/account-fields";

/**
 * §7 — métodos salvos como referência (bandeira + 4 dígitos + validade).
 * A loja nunca recebe o número completo — o aviso está no formulário.
 */

const BRANDS = [
  { value: "visa", label: "Visa" },
  { value: "master", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "hiper", label: "Hipercard" },
  { value: "amex", label: "Amex" },
  { value: "outra", label: "Outra" },
];

async function authed(path: string, init?: RequestInit) {
  const token = await getClientAuth()?.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; method?: PaymentMethodRef; methods?: PaymentMethodRef[] };
  if (!res.ok || data.error) throw new Error(data.error ?? `Erro ${res.status}.`);
  return data;
}

function expired(method: PaymentMethodRef): boolean {
  const now = new Date();
  return method.expYear * 12 + (method.expMonth - 1) < now.getFullYear() * 12 + now.getMonth();
}

export default function ContaPagamentosPage() {
  const { user, notify } = useStore();
  const [methods, setMethods] = useState<PaymentMethodRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState("visa");
  const [last4, setLast4] = useState("");
  const [expMonth, setExpMonth] = useState(1);
  const [expYear, setExpYear] = useState(new Date().getFullYear());
  const [holderName, setHolderName] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const data = await authed("/api/account/payments");
      setMethods(data.methods ?? []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await authed("/api/account/payments");
        setMethods(data.methods ?? []);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <h1 className="sr-only">Pagamentos</h1>;

  const handleAdd = async () => {
    setBusy(true);
    try {
      await authed("/api/account/payments", {
        method: "POST",
        body: JSON.stringify({ method: { brand, last4, expMonth, expYear, holderName } }),
      });
      notify("Método salvo (só a referência).", "success");
      setAdding(false);
      setLast4("");
      setHolderName("");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePrimary = async (id: string) => {
    try {
      await authed(`/api/account/payments/${id}`, { method: "PUT" });
      notify("Método principal atualizado.", "success");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    }
  };

  const handleRemove = async (method: PaymentMethodRef) => {
    if (!window.confirm(`Remover •••• ${method.last4}?`)) return;
    try {
      await authed(`/api/account/payments/${method.id}`, { method: "DELETE" });
      notify("Método removido.", "success");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao excluir.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl text-gold">Pagamentos</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Só referências — a loja nunca guarda o número do cartão (§7)
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => setAdding(true)}
          >
            Adicionar método
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando métodos…</p>}

      {adding && (
        <Card title="Novo método (referência)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bandeira">
              <SelectInput value={brand} options={BRANDS} onChange={setBrand} />
            </Field>
            <Field label="Últimos 4 dígitos" hint="Nunca digite o número completo.">
              <TextInput value={last4} placeholder="1234" onChange={(v) => setLast4(v.replace(/\D/g, "").slice(0, 4))} />
            </Field>
            <Field label="Mês de validade">
              <NumberInput value={expMonth} min={1} max={12} step={1} onChange={setExpMonth} />
            </Field>
            <Field label="Ano de validade">
              <NumberInput value={expYear} min={new Date().getFullYear()} max={2100} step={1} onChange={setExpYear} />
            </Field>
            <Field label="Nome impresso (opcional)">
              <TextInput value={holderName} onChange={setHolderName} />
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={busy}
              onClick={() => void handleAdd()}
            >
              {busy ? "Salvando…" : "Salvar referência"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => setAdding(false)}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {!loading && methods.length === 0 && !adding && (
        <p className="text-sm text-[var(--text-muted)]">Nenhum método salvo.</p>
      )}

      <div className="space-y-2">
        {methods.map((method) => (
          <div key={method.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {BRANDS.find((b) => b.value === method.brand)?.label} •••• {method.last4}
                {method.isDefault && <span className="ml-2 text-xs text-gold">· principal</span>}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                validade {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                {expired(method) ? " · vencido" : ""}
                {method.holderName ? ` · ${method.holderName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!method.isDefault && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  onClick={() => void handlePrimary(method.id)}
                >
                  Tornar principal
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost px-3 py-2 text-[11px]"
                onClick={() => void handleRemove(method)}
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
