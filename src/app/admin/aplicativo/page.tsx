"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { Card, DateTimeInput, Field, SelectInput, TextInput } from "@/components/admin/form-fields";
import { useAdminAppContent } from "@/components/admin/useAdminPlus";
import {
  APP_EXPERIENCE_FIELDS,
  APP_EXPERIENCE_LABELS,
  APP_EXTRA_KINDS,
  APP_EXTRA_KIND_LABELS,
  sanitizeAppContent,
  type AppContent,
  type AppEvent,
  type AppExtra,
  type AppHighlight,
} from "@/lib/app-content";
import { toLocalInput } from "@/lib/plus-fields";

/**
 * §33 — Aplicativo no painel: administra os conteúdos específicos do app
 * (destaques, scanner, eventos, conteúdos extras e experiências). Notificações
 * ficam no módulo Notificações (§16/§33); o app tem autonomia própria.
 */

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function blankHighlight(): AppHighlight {
  return { id: newId("app-hl"), title: "", subtitle: "", target: "/loja", active: true };
}

function blankEvent(): AppEvent {
  return { id: newId("app-ev"), title: "", date: "", description: "", active: true };
}

function blankExtra(): AppExtra {
  return { id: newId("app-ex"), title: "", kind: "arte", target: "/loja", active: true };
}

export default function AdminAppPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const app = useAdminAppContent();

  const [draft, setDraft] = useState<AppContent | null>(null);

  /** Rascunho local: sem edições, vale o documento que veio do servidor. */
  const content = draft ?? app.content;

  const set = <K extends keyof AppContent>(key: K, value: AppContent[K]) =>
    setDraft((prev) => {
      const base = prev ?? app.content;
      return base ? { ...base, [key]: value } : prev;
    });

  const handleSave = async () => {
    const target = draft ?? app.content;
    if (!target) return;
    const parsed = sanitizeAppContent(target);
    if (!parsed.ok) {
      notify(parsed.error, "error");
      return;
    }
    const result = await app.save(parsed.item);
    if (result.ok) {
      notify("Conteúdo do aplicativo atualizado.", "success");
      setDraft(null);
      app.reload();
    } else {
      notify(result.message, "error");
    }
  };

  if (!user) {
    return <AdminLogin note="Entre com a conta administradora para gerenciar o aplicativo." />;
  }

  const allowed = roleLoading || can("notifications.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">notifications.view</code> — o Aplicativo é administrado por
          Administrador e Marketing, junto das notificações (§33/§35).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("notifications.edit");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Aplicativo</p>
          <p className="text-xs text-[var(--text-muted)]">
            Conteúdos próprios do app: destaques, scanner, eventos, extras e experiências (§33)
            {app.content ? ` · ${content?.highlights.length ?? 0} destaque(s)` : ""}
          </p>
        </div>
        {canEdit && draft && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            disabled={app.busy}
            onClick={() => void handleSave()}
          >
            {app.busy ? "Gravando…" : "Salvar aplicativo"}
          </button>
        )}
      </div>

      {app.loading && <p className="text-sm text-[var(--text-muted)]">Carregando aplicativo…</p>}
      {app.error && <p className="text-sm text-[#e5484d]">{app.error}</p>}

      {content && (
        <>
          {/* destaques */}
          <Card title="Destaques">
            {content.highlights.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum destaque — o app abre com o conteúdo padrão.
              </p>
            )}
            <div className="space-y-3">
              {content.highlights.map((highlight, index) => (
                <div
                  key={highlight.id}
                  className="grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-2"
                >
                  <Field label="Título">
                    <TextInput
                      value={highlight.title}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "highlights",
                          content.highlights.map((row, i) =>
                            i === index ? { ...row, title: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Subtítulo">
                    <TextInput
                      value={highlight.subtitle}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "highlights",
                          content.highlights.map((row, i) =>
                            i === index ? { ...row, subtitle: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Destino" hint="Caminho começando com / ou URL http(s).">
                    <TextInput
                      value={highlight.target}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "highlights",
                          content.highlights.map((row, i) =>
                            i === index ? { ...row, target: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Imagem (URL)">
                    <TextInput
                      value={highlight.image ?? ""}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "highlights",
                          content.highlights.map((row, i) =>
                            i === index ? { ...row, image: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="flex items-center justify-between sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={highlight.active}
                        disabled={!canEdit}
                        onChange={(event) =>
                          set(
                            "highlights",
                            content.highlights.map((row, i) =>
                              i === index ? { ...row, active: event.target.checked } : row,
                            ),
                          )
                        }
                      />
                      Destaque ativo
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-1.5 text-[11px] text-[#e5484d]"
                        onClick={() =>
                          set(
                            "highlights",
                            content.highlights.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost mt-3 px-3 py-2 text-[11px]"
                onClick={() => set("highlights", [...content.highlights, blankHighlight()])}
              >
                Adicionar destaque
              </button>
            )}
          </Card>

          {/* scanner */}
          <Card title="Scanner">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título">
                <TextInput
                  value={content.scanner.title}
                  disabled={!canEdit}
                  onChange={(value) => set("scanner", { ...content.scanner, title: value })}
                />
              </Field>
              <Field label="Instrução">
                <TextInput
                  value={content.scanner.hint}
                  disabled={!canEdit}
                  onChange={(value) => set("scanner", { ...content.scanner, hint: value })}
                />
              </Field>
              <Field label="Destino padrão" hint="Quando o QR escaneado não é da loja.">
                <TextInput
                  value={content.scanner.defaultTarget}
                  disabled={!canEdit}
                  onChange={(value) => set("scanner", { ...content.scanner, defaultTarget: value })}
                />
              </Field>
              <div className="pb-1">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Scanner
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={content.scanner.enabled}
                    disabled={!canEdit}
                    onChange={(event) =>
                      set("scanner", { ...content.scanner, enabled: event.target.checked })
                    }
                  />
                  Câmera disponível no app
                </label>
              </div>
            </div>
          </Card>

          {/* eventos */}
          <Card title="Eventos">
            {content.events.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Nenhum evento cadastrado.</p>
            )}
            <div className="space-y-3">
              {content.events.map((event, index) => (
                <div
                  key={event.id}
                  className="grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-2"
                >
                  <Field label="Título">
                    <TextInput
                      value={event.title}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "events",
                          content.events.map((row, i) =>
                            i === index ? { ...row, title: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Data e hora">
                    <DateTimeInput
                      value={toLocalInput(event.date)}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "events",
                          content.events.map((row, i) =>
                            i === index ? { ...row, date: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Descrição" className="sm:col-span-2">
                    <TextInput
                      value={event.description}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "events",
                          content.events.map((row, i) =>
                            i === index ? { ...row, description: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="flex items-center justify-between sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={event.active}
                        disabled={!canEdit}
                        onChange={(ev) =>
                          set(
                            "events",
                            content.events.map((row, i) =>
                              i === index ? { ...row, active: ev.target.checked } : row,
                            ),
                          )
                        }
                      />
                      Evento ativo
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-1.5 text-[11px] text-[#e5484d]"
                        onClick={() => set("events", content.events.filter((_, i) => i !== index))}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost mt-3 px-3 py-2 text-[11px]"
                onClick={() => set("events", [...content.events, blankEvent()])}
              >
                Adicionar evento
              </button>
            )}
          </Card>

          {/* conteúdos extras */}
          <Card title="Conteúdos extras">
            {content.extras.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum conteúdo extra — bastidores, artes e trilhas ficam no app.
              </p>
            )}
            <div className="space-y-3">
              {content.extras.map((extra, index) => (
                <div
                  key={extra.id}
                  className="grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-3"
                >
                  <Field label="Título">
                    <TextInput
                      value={extra.title}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "extras",
                          content.extras.map((row, i) => (i === index ? { ...row, title: value } : row)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Tipo">
                    <SelectInput
                      value={extra.kind}
                      disabled={!canEdit}
                      options={APP_EXTRA_KINDS.map((kind) => ({
                        value: kind,
                        label: APP_EXTRA_KIND_LABELS[kind],
                      }))}
                      onChange={(value) =>
                        set(
                          "extras",
                          content.extras.map((row, i) =>
                            i === index ? { ...row, kind: value as AppExtra["kind"] } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Destino">
                    <TextInput
                      value={extra.target}
                      disabled={!canEdit}
                      onChange={(value) =>
                        set(
                          "extras",
                          content.extras.map((row, i) =>
                            i === index ? { ...row, target: value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="flex items-center justify-between sm:col-span-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={extra.active}
                        disabled={!canEdit}
                        onChange={(ev) =>
                          set(
                            "extras",
                            content.extras.map((row, i) =>
                              i === index ? { ...row, active: ev.target.checked } : row,
                            ),
                          )
                        }
                      />
                      Conteúdo ativo
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-1.5 text-[11px] text-[#e5484d]"
                        onClick={() => set("extras", content.extras.filter((_, i) => i !== index))}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost mt-3 px-3 py-2 text-[11px]"
                onClick={() => set("extras", [...content.extras, blankExtra()])}
              >
                Adicionar conteúdo extra
              </button>
            )}
          </Card>

          {/* experiências */}
          <Card title="Experiências do app">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {APP_EXPERIENCE_FIELDS.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] p-3 text-xs"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={content.experiences[key]}
                    disabled={!canEdit}
                    onChange={(event) =>
                      set("experiences", {
                        ...content.experiences,
                        [key]: event.target.checked,
                      })
                    }
                  />
                  <span>
                    <span className="block font-bold text-gold">{APP_EXPERIENCE_LABELS[key]}</span>
                    <span className="text-[var(--text-muted)]">
                      recurso específico do aplicativo (§33)
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* notificações */}
          <Card title="Notificações do app">
            <p className="text-sm text-[var(--text-muted)]">
              O envio de notificações (e-mail, app e push) continua no módulo Notificações (§16/§33)
              — lá você redige, agenda e registra o comunicado.
            </p>
            <Link href="/admin/notificacoes" className="btn btn-ghost inline-flex px-3 py-2 text-[11px]">
              Abrir módulo Notificações
            </Link>
          </Card>

          {canEdit && (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-xs text-[var(--text-muted)]">
                O aplicativo tem autonomia própria (§33): estas definições valem só para o app.
              </p>
              <button
                type="button"
                className="btn btn-primary px-4 py-2 text-[11px]"
                disabled={app.busy}
                onClick={() => void handleSave()}
              >
                {app.busy ? "Gravando…" : "Salvar aplicativo"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
