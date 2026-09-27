"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { getClientAuth } from "@/lib/firebase";
import { Card, Field, SelectInput, TextInput } from "@/components/admin/form-fields";
import type { CustomerAddress } from "@/lib/account-fields";

/**
 * §6 — endereços: Casa/Trabalho/Outro com principal. O principal é
 * preenchido automaticamente no checkout (dá para trocar na compra).
 */

const EMPTY = {
  label: "Casa",
  recipient: "",
  cep: "",
  state: "",
  city: "",
  district: "",
  street: "",
  number: "",
  complement: "",
  reference: "",
  phone: "",
};

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
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; address?: CustomerAddress; addresses?: CustomerAddress[] };
  if (!res.ok || data.error) throw new Error(data.error ?? `Erro ${res.status}.`);
  return data;
}

export default function ContaEnderecosPage() {
  const { user, notify } = useStore();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CustomerAddress | "novo" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const data = await authed("/api/account/addresses");
      setAddresses(data.addresses ?? []);
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
        const data = await authed("/api/account/addresses");
        setAddresses(data.addresses ?? []);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Falha ao carregar.", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  const startEdit = (address: CustomerAddress | "novo") => {
    setEditing(address);
    setForm(
      address === "novo"
        ? EMPTY
        : {
            label: address.label,
            recipient: address.recipient,
            cep: address.cep,
            state: address.state,
            city: address.city,
            district: address.district,
            street: address.street,
            number: address.number,
            complement: address.complement ?? "",
            reference: address.reference ?? "",
            phone: address.phone ?? "",
          },
    );
  };

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setBusy(true);
    try {
      if (editing === "novo") {
        await authed("/api/account/addresses", { method: "POST", body: JSON.stringify({ address: form }) });
        notify(addresses.length === 0 ? "Endereço salvo como principal." : "Endereço salvo.", "success");
      } else if (editing) {
        await authed(`/api/account/addresses/${editing.id}`, { method: "PUT", body: JSON.stringify({ address: form }) });
        notify("Endereço atualizado.", "success");
      }
      setEditing(null);
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePrimary = async (id: string) => {
    try {
      await authed(`/api/account/addresses/${id}`, { method: "PUT", body: JSON.stringify({ primary: true }) });
      notify("Endereço principal atualizado.", "success");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao salvar.", "error");
    }
  };

  const handleRemove = async (address: CustomerAddress) => {
    if (!window.confirm(`Excluir o endereço “${address.label} — ${address.street}”?`)) return;
    try {
      await authed(`/api/account/addresses/${address.id}`, { method: "DELETE" });
      notify("Endereço excluído.", "success");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao excluir.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-2xl text-gold">Endereços</p>
          <p className="text-xs text-[var(--text-muted)]">
            O principal entra sozinho no checkout (§6)
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => startEdit("novo")}
          >
            Novo endereço
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando endereços…</p>}

      {editing && (
        <Card title={editing === "novo" ? "Novo endereço" : `Editar — ${editing.label}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Identificação">
              <SelectInput
                value={form.label}
                options={[
                  { value: "Casa", label: "Casa" },
                  { value: "Trabalho", label: "Trabalho" },
                  { value: "Outro", label: "Outro" },
                ]}
                onChange={(v) => set("label", v)}
              />
            </Field>
            <Field label="Destinatário">
              <TextInput value={form.recipient} onChange={(v) => set("recipient", v)} />
            </Field>
            <Field label="CEP">
              <TextInput value={form.cep} placeholder="00000000" onChange={(v) => set("cep", v)} />
            </Field>
            <Field label="UF">
              <TextInput value={form.state} placeholder="SP" onChange={(v) => set("state", v)} />
            </Field>
            <Field label="Cidade">
              <TextInput value={form.city} onChange={(v) => set("city", v)} />
            </Field>
            <Field label="Bairro">
              <TextInput value={form.district} onChange={(v) => set("district", v)} />
            </Field>
            <Field label="Rua">
              <TextInput value={form.street} onChange={(v) => set("street", v)} />
            </Field>
            <Field label="Número">
              <TextInput value={form.number} onChange={(v) => set("number", v)} />
            </Field>
            <Field label="Complemento (opcional)">
              <TextInput value={form.complement} onChange={(v) => set("complement", v)} />
            </Field>
            <Field label="Referência (opcional)">
              <TextInput value={form.reference} onChange={(v) => set("reference", v)} />
            </Field>
            <Field label="Telefone (opcional)">
              <TextInput value={form.phone} onChange={(v) => set("phone", v)} />
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              {busy ? "Salvando…" : "Salvar endereço"}
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

      {!loading && addresses.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum endereço — cadastre o primeiro com o botão “Novo endereço”.
        </p>
      )}

      <div className="space-y-2">
        {addresses.map((address) => (
          <div key={address.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {address.label} — {address.recipient}
                {address.isDefault && <span className="ml-2 text-xs text-gold">· principal</span>}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {address.street}, {address.number}
                {address.complement ? ` · ${address.complement}` : ""} — {address.district},{" "}
                {address.city}/{address.state} · CEP {address.cep}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!address.isDefault && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  onClick={() => void handlePrimary(address.id)}
                >
                  Tornar principal
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost px-3 py-2 text-[11px]"
                onClick={() => startEdit(address)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn-ghost px-3 py-2 text-[11px]"
                onClick={() => void handleRemove(address)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
