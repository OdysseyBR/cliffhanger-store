"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminLaunchContent } from "@/components/admin/useAdminContent";
import { fetchCatalogItems } from "@/components/admin/admin-api";
import { COVER_MOTIF_OPTIONS } from "@/lib/product-fields";
import {
  Card,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import {
  launchContentOf,
  sanitizeLaunchContent,
  toLaunchContentForm,
  type LaunchContentForm,
} from "@/lib/content-fields";
import type { CoverMotif, Launch, LaunchSocial, Universe, Work } from "@/lib/types";

/**
 * §12/§20 — Lançamentos: conteúdo editorial da página pública (destaque,
 * arte, sinopse, trailer, redes sociais e vínculos com obra/universo). A
 * mecânica de pré-venda continua no módulo Pré-vendas — os dois escrevem
 * no mesmo documento `launches` sem se sobrescrever.
 */

function when(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
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

export default function AdminLaunchesPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const launches = useAdminLaunchContent();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LaunchContentForm | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [universes, setUniverses] = useState<Universe[]>([]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [w, u] = await Promise.all([
        fetchCatalogItems<Work>("works"),
        fetchCatalogItems<Universe>("universes"),
      ]);
      if (w.ok) setWorks(w.data.items ?? []);
      if (u.ok) setUniverses(u.data.items ?? []);
    })();
  }, [user]);

  const items = launches.items ?? [];
  const editing = editingId ? items.find((launch) => launch.id === editingId) ?? null : null;

  const set = <K extends keyof LaunchContentForm>(key: K, value: LaunchContentForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const updateSocial = (index: number, patch: Partial<LaunchSocial>) =>
    setForm((prev) =>
      prev ? { ...prev, socials: prev.socials.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : prev,
    );

  const addSocial = () =>
    setForm((prev) =>
      prev ? { ...prev, socials: [...prev.socials, { label: "", href: "" }] } : prev,
    );

  const removeSocial = (index: number) =>
    setForm((prev) =>
      prev ? { ...prev, socials: prev.socials.filter((_, i) => i !== index) } : prev,
    );

  const startEdit = (launch: Launch) => {
    setEditingId(launch.id);
    setForm(toLaunchContentForm(launchContentOf(launch)));
  };

  const handleSave = async () => {
    if (!editing || !form) return;
    const parsed = sanitizeLaunchContent(form);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await launches.save(editing.id, form);
    if (result.ok) {
      notify(
        result.data.changed
          ? `Conteúdo de “${editing.title}” atualizado — a página pública já reflete.`
          : "Nada mudou — o conteúdo já era o mesmo.",
        "success",
      );
      setEditingId(null);
      setForm(null);
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para editar os lançamentos." />;
  }

  const allowed = roleLoading || can("launches.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">launches.view</code> — o conteúdo dos lançamentos fica com
          Editorial, Marketing, Comercial, Estoque e Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("launches.edit");

  const totals = {
    launches: items.length,
    withTrailer: items.filter((launch) => launch.trailerUrl).length,
    withSynopsis: items.filter((launch) => launch.synopsis).length,
    socials: items.reduce((sum, launch) => sum + (launch.socials?.length ?? 0), 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Lançamentos</p>
          <p className="text-xs text-[var(--text-muted)]">
            Arte, sinopse, trailer, redes e vínculos — a mecânica de pré-venda continua em
            Pré-vendas (§20)
            {launches.items ? ` · ${totals.launches} lançamento(s)` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Lançamentos
          </p>
          <p className="text-lg font-bold">{totals.launches}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Com sinopse
          </p>
          <p className="text-lg font-bold text-gold">{totals.withSynopsis}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Com trailer
          </p>
          <p className="text-lg font-bold">{totals.withTrailer}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Links sociais
          </p>
          <p className="text-lg font-bold">{totals.socials}</p>
        </div>
      </div>

      {editing && form && (
        <Card title={`Conteúdo — ${editing.title}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Destaque (subtítulo da página)">
              <TextInput
                value={form.highlight}
                placeholder="Ex.: O capítulo final da saga"
                onChange={(v) => set("highlight", v)}
              />
            </Field>
            <Field label="Sinopse">
              <TextArea
                value={form.synopsis}
                rows={4}
                placeholder="Texto da página pública do lançamento."
                onChange={(v) => set("synopsis", v)}
              />
            </Field>
            <Field label="Trailer (.mp4/.webm ou YouTube/Vimeo)" hint="Vazio = sem trailer.">
              <TextInput
                value={form.trailerUrl}
                placeholder="https://…"
                onChange={(v) => set("trailerUrl", v)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Obra vinculada">
                <SelectInput
                  value={form.workId}
                  options={[
                    { value: "", label: "Nenhuma" },
                    ...works.map((work) => ({ value: work.id, label: work.title })),
                  ]}
                  onChange={(v) => set("workId", v)}
                />
              </Field>
              <Field label="Universo vinculado">
                <SelectInput
                  value={form.universeId}
                  options={[
                    { value: "", label: "Nenhum" },
                    ...universes.map((universe) => ({ value: universe.id, label: universe.name })),
                  ]}
                  onChange={(v) => set("universeId", v)}
                />
              </Field>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Arte da página (mesmo padrão das capas)
            </p>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Fundo">
                <TextInput value={form.coverBg} onChange={(v) => set("coverBg", v)} />
              </Field>
              <Field label="Traço">
                <TextInput value={form.coverFg} onChange={(v) => set("coverFg", v)} />
              </Field>
              <Field label="Destaque">
                <TextInput value={form.coverAccent} onChange={(v) => set("coverAccent", v)} />
              </Field>
              <Field label="Motivo">
                <SelectInput
                  value={form.coverMotif}
                  options={COVER_MOTIF_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  onChange={(v) => set("coverMotif", v as CoverMotif)}
                />
              </Field>
            </div>
            <div
              className="flex h-16 items-center justify-center rounded-lg border border-[var(--border)] text-xs font-bold"
              style={{ background: form.coverBg, color: form.coverFg }}
            >
              <span style={{ color: form.coverAccent }}>●</span>&nbsp;pré-visualização da arte
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Redes sociais ({form.socials.length} de 8)
              </p>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-[11px]"
                  onClick={addSocial}
                  disabled={form.socials.length >= 8}
                >
                  Adicionar link
                </button>
              )}
            </div>
            {form.socials.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">Sem links — a página não mostra a faixa social.</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {form.socials.map((social, index) => (
                <div
                  key={`social-${index}`}
                  className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:grid-cols-3"
                >
                  <Field label="Rótulo">
                    <TextInput
                      value={social.label}
                      placeholder="Instagram"
                      onChange={(value) => updateSocial(index, { label: value })}
                    />
                  </Field>
                  <Field label="URL">
                    <TextInput
                      value={social.href}
                      placeholder="https://…"
                      onChange={(value) => updateSocial(index, { href: value })}
                    />
                  </Field>
                  <div className="flex items-end justify-end pb-1">
                    <button
                      type="button"
                      className="btn btn-ghost px-2 py-2 text-[11px]"
                      onClick={() => removeSocial(index)}
                      aria-label={`Remover link ${social.label || index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={launches.busy || !canEdit}
              onClick={() => void handleSave()}
            >
              {launches.busy ? "Gravando…" : "Salvar conteúdo"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setEditingId(null);
                setForm(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {launches.loading && <p className="text-sm text-[var(--text-muted)]">Carregando lançamentos…</p>}
      {launches.error && <p className="text-sm text-[#e5484d]">{launches.error}</p>}

      {!launches.loading && !launches.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum lançamento — crie a mecânica em Pré-vendas e volte aqui para o conteúdo.
        </p>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {items.map((launch) => (
            <div key={launch.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{launch.title}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  /lancamentos/{launch.slug} · {when(launch.releaseDate)}
                  {launch.highlight ? ` · ${launch.highlight}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {launch.synopsis ? <Label tone="border-gold/50 bg-gold/10 text-gold">sinopse</Label> : <Label tone="border-[#e5484d]/50 text-[#e5484d]">sem sinopse</Label>}
                  {launch.trailerUrl ? <Label>trailer</Label> : <Label>sem trailer</Label>}
                  {(launch.socials?.length ?? 0) > 0 && <Label>{launch.socials?.length} social(is)</Label>}
                  {launch.preOrder ? <Label>pré-venda</Label> : <Label>venda direta</Label>}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  onClick={() => startEdit(launch)}
                >
                  Editar conteúdo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
