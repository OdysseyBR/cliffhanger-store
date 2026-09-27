"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminNews } from "@/components/admin/useAdminContent";
import {
  Card,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import {
  BLANK_NEWS_FORM,
  sanitizeNewsInput,
  toNewsForm,
  type NewsForm,
} from "@/lib/content-fields";
import type { NewsItem } from "@/lib/types";

/**
 * §12 — Notícias: redação com rascunho/publicação, slug único e data de
 * publicação fixada na primeira vez. A vitrine pública não está nas
 * rotas obrigatórias (§22) — entra em etapa futura; o painel já deixa o
 * acervo pronto com URL reservada (/noticias/&lt;slug&gt;).
 */

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

export default function AdminNewsPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const news = useAdminNews();

  const [editing, setEditing] = useState<NewsItem | "novo" | null>(null);
  const [form, setForm] = useState<NewsForm>(BLANK_NEWS_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  const set = <K extends keyof NewsForm>(key: K, value: NewsForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const existing = editing && editing !== "novo" ? editing : null;
    const parsed = sanitizeNewsInput(form, existing);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await news.save(parsed.item, editing === "novo");
    if (result.ok) {
      notify(
        editing === "novo" ? `Notícia “${parsed.item.title}” criada.` : `Notícia “${parsed.item.title}” atualizada.`,
        "success",
      );
      setEditing(null);
      setForm(BLANK_NEWS_FORM);
    } else {
      notify(result.message, "error");
    }
  };

  const handleRemove = async (item: NewsItem) => {
    if (!window.confirm(`Excluir a notícia “${item.title}”? O slug ${item.slug} fica livre.`)) {
      return;
    }
    setBusyId(item.id);
    const result = await news.remove(item.id);
    setBusyId(null);
    if (result.ok) notify("Notícia excluída.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para redigir notícias." />;
  }

  const allowed = roleLoading || can("news.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">news.view</code> — notícias ficam com Editorial, Marketing e
          Administrador (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("news.edit");
  const items = news.items ?? [];

  const totals = {
    all: items.length,
    drafts: items.filter((item) => item.status === "draft").length,
    published: items.filter((item) => item.status === "published").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Notícias</p>
          <p className="text-xs text-[var(--text-muted)]">
            Redação com rascunho e publicação — a vitrine pública entra em etapa futura
            {news.items ? ` · ${totals.all} notícia(s)` : ""}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => {
              setEditing("novo");
              setForm(BLANK_NEWS_FORM);
            }}
          >
            Nova notícia
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Notícias
          </p>
          <p className="text-lg font-bold">{totals.all}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Rascunhos
          </p>
          <p className="text-lg font-bold">{totals.drafts}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Publicadas
          </p>
          <p className="text-lg font-bold text-gold">{totals.published}</p>
        </div>
      </div>

      {editing && (
        <Card title={editing === "novo" ? "Nova notícia" : `Editar — ${form.title || "sem título"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título">
              <TextInput value={form.title} placeholder="Ex.: Bastidores do novo capítulo" onChange={(v) => set("title", v)} />
            </Field>
            <Field label="Slug (URL reservada)" hint="Vazio = gerado do título. /noticias/<slug> na etapa futura.">
              <TextInput value={form.slug} placeholder="bastidores-do-novo-capitulo" onChange={(v) => set("slug", v)} />
            </Field>
            <Field label="Resumo (até 300)">
              <TextArea value={form.excerpt} rows={2} placeholder="Chamada da notícia." onChange={(v) => set("excerpt", v)} />
            </Field>
            <Field label="Imagem de capa (URL, opcional)">
              <TextInput value={form.coverImage} placeholder="https://…" onChange={(v) => set("coverImage", v)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Texto (mín. 20 caracteres)">
                <TextArea value={form.body} rows={8} placeholder="Corpo da notícia." onChange={(v) => set("body", v)} />
              </Field>
            </div>
            <Field label="Estado">
              <SelectInput
                value={form.status}
                options={[
                  { value: "draft", label: "Rascunho" },
                  { value: "published", label: "Publicada" },
                ]}
                onChange={(v) => set("status", v as NewsItem["status"])}
              />
            </Field>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2 text-[11px]"
              disabled={news.busy}
              onClick={() => void handleSave()}
            >
              {news.busy ? "Gravando…" : "Salvar notícia"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2 text-[11px]"
              onClick={() => {
                setEditing(null);
                setForm(BLANK_NEWS_FORM);
              }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {news.loading && <p className="text-sm text-[var(--text-muted)]">Carregando notícias…</p>}
      {news.error && <p className="text-sm text-[#e5484d]">{news.error}</p>}

      {!news.loading && !news.error && items.length === 0 && !editing && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma notícia redigida — crie a primeira com o botão “Nova notícia”.
        </p>
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-[var(--border)]/60 p-0">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{item.title}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  /noticias/{item.slug} · atualizada em {when(item.updatedAt)}
                  {item.status === "published" ? ` · publicada em ${when(item.publishedAt)}` : ""}
                </p>
                {item.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{item.excerpt}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {item.status === "published" ? (
                    <Label tone="border-gold/50 bg-gold/10 text-gold">publicada</Label>
                  ) : (
                    <Label>rascunho</Label>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setEditing(item);
                      setForm(toNewsForm(item));
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    disabled={busyId === item.id}
                    onClick={() => void handleRemove(item)}
                  >
                    {busyId === item.id ? "Excluindo…" : "Excluir"}
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
