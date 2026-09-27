"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { useAdminPermissions } from "@/components/admin/AdminRoleProvider";
import { useAdminLibraries } from "@/components/admin/useAdminDigital";
import { SelectInput, TextInput } from "@/components/admin/form-fields";
import type { AdminLibrary, AdminLibraryItem } from "@/lib/types";

/**
 * §12/§8 — Biblioteca Digital: visão das licenças dos clientes (itens
 * concedidos, progresso, última posição e marcadores sincronizados) com
 * concessão e revogação de acesso — escrita restrita a `digital.edit`.
 *
 * O id do documento `libraries/{uid}` é o uid da conta; a identidade
 * (nome/e-mail) vem de `customers/{uid}`.
 */

function when(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function clock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
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

function ProgressLine({ item }: { item: AdminLibraryItem }) {
  const progress = item.progress;
  if (!progress) return null;
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-raised)]">
        <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
      </div>
      <span className="font-bold text-gold">{percent}%</span>
      {typeof progress.page === "number" && (
        <span>
          página {progress.page}
          {typeof progress.pages === "number" ? ` de ${progress.pages}` : ""}
        </span>
      )}
      {typeof progress.position === "number" && <span>em {clock(progress.position)}</span>}
      <span>
        {progress.bookmarks.length} marcador(es) · {when(progress.updatedAt)}
      </span>
    </div>
  );
}

export default function AdminDigitalLibraryPage() {
  const { user, notify } = useStore();
  const { me, can, loading: roleLoading } = useAdminPermissions();
  const digital = useAdminLibraries();

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [grantUid, setGrantUid] = useState<string | null>(null);
  const [grantProductId, setGrantProductId] = useState("");

  const toggle = (uid: string) =>
    setCollapsed((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));

  const handleGrant = async (library: AdminLibrary) => {
    if (!grantProductId) {
      notify("Escolha um item para conceder.", "error");
      return;
    }
    const result = await digital.grant(library.uid, grantProductId);
    if (result.ok) {
      if (result.data.granted) notify("Acesso concedido à biblioteca.", "success");
      else notify("Este item já estava na biblioteca deste cliente.", "error");
      setGrantUid(null);
      setGrantProductId("");
    } else {
      notify(result.message, "error");
    }
  };

  const handleRevoke = async (library: AdminLibrary, item: AdminLibraryItem) => {
    const owner = library.email || library.name || library.uid;
    const label = item.missing ? `${item.title} (${item.productId})` : item.title;
    if (
      !window.confirm(
        `Revogar “${label}” da biblioteca de ${owner}? O cliente perde o acesso imediatamente.`,
      )
    ) {
      return;
    }
    const result = await digital.revoke(library.uid, item.productId);
    if (result.ok) notify("Acesso revogado da biblioteca.", "success");
    else notify(result.message, "error");
  };

  if (!user) {
    return (
      <AdminLogin note="Entre com a conta administradora para consultar a biblioteca digital." />
    );
  }

  const allowed = roleLoading || can("digital.view");
  if (!allowed && me) {
    return (
      <div className="card space-y-2 p-6">
        <p className="text-display text-2xl text-gold">Sem permissão</p>
        <p className="text-sm text-[var(--text-muted)]">
          Seu papel <strong>{me.roleLabel}</strong> não inclui a permissão{" "}
          <code className="font-mono">digital.view</code> — a biblioteca digital é restrita aos
          papéis que operam licenças de e-books e audiobooks (§13).
        </p>
      </div>
    );
  }

  const canEdit = !roleLoading && can("digital.edit");
  const libraries = digital.libraries ?? [];
  const products = digital.products ?? [];

  const needle = query.trim().toLowerCase();
  const visible = libraries.filter((library) =>
    !needle
      ? true
      : library.uid.toLowerCase().includes(needle) ||
        (library.email ?? "").toLowerCase().includes(needle) ||
        (library.name ?? "").toLowerCase().includes(needle),
  );

  const allItems = libraries.flatMap((library) => library.items);
  const withProgress = allItems.filter((item) => item.progress);
  const avgPercent =
    withProgress.length > 0
      ? Math.round(
          withProgress.reduce((sum, item) => sum + (item.progress?.percent ?? 0), 0) /
            withProgress.length,
        )
      : 0;
  const totals = {
    libraries: libraries.length,
    items: allItems.length,
    withProgress: withProgress.length,
    bookmarks: libraries.reduce((sum, library) => sum + library.bookmarks, 0),
    missing: allItems.filter((item) => item.missing).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Biblioteca Digital</p>
          <p className="text-xs text-[var(--text-muted)]">
            Licenças, progresso e marcadores dos clientes — concessão e revogação de acesso (§8)
            {digital.libraries ? ` · ${totals.libraries} biblioteca(s)` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Bibliotecas
          </p>
          <p className="text-lg font-bold">{totals.libraries}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Itens concedidos
          </p>
          <p className="text-lg font-bold text-gold">{totals.items}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Com progresso
          </p>
          <p className="text-lg font-bold">{totals.withProgress}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Progresso médio
          </p>
          <p className="text-lg font-bold">{totals.withProgress > 0 ? `${avgPercent}%` : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Marcadores
          </p>
          <p className="text-lg font-bold">{totals.bookmarks}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-72">
          <TextInput
            value={query}
            placeholder="Buscar por cliente, e-mail ou uid"
            onChange={setQuery}
          />
        </div>
        {totals.missing > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            {totals.missing} item(ns) ligado(s) a produto(s) fora do catálogo (legado) — podem ser
            revogados normalmente.
          </p>
        )}
      </div>

      {digital.loading && (
        <p className="text-sm text-[var(--text-muted)]">Carregando bibliotecas…</p>
      )}
      {digital.error && <p className="text-sm text-[#e5484d]">{digital.error}</p>}

      {!digital.loading && !digital.error && libraries.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma biblioteca criada — elas surgem quando um cliente compra um item digital com a
          conta logada, e podem ser concedidas aqui manualmente.
        </p>
      )}

      {!digital.loading && !digital.error && libraries.length > 0 && visible.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Nenhum cliente corresponde ao filtro.</p>
      )}

      {visible.map((library) => {
        const open = !collapsed.includes(library.uid);
        const owner = library.name || library.email || library.uid;
        const ebooks = library.items.filter((item) => item.type === "ebook").length;
        const audiobooks = library.items.length - ebooks;
        const options = products
          .filter(
            (product) =>
              product.digital === true &&
              !library.items.some((item) => item.productId === product.id),
          )
          .map((product) => ({ value: product.id, label: product.title }));

        return (
          <div key={library.uid} className="card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gold">{owner}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  <span className="font-mono">{library.uid}</span>
                  {library.email && library.name ? ` · ${library.email}` : ""} · atualizada em{" "}
                  {when(library.updatedAt)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Label>{library.items.length} item(ns)</Label>
                  <Label tone="border-gold/50 bg-gold/10 text-gold">{ebooks} e-book(s)</Label>
                  <Label tone="border-violet-soft/50 text-violet-soft">{audiobooks} audio(s)</Label>
                  <Label>{library.progressCount} com progresso</Label>
                  <Label>{library.bookmarks} marcador(es)</Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-2 text-[11px]"
                    onClick={() => {
                      setGrantUid(open && grantUid === library.uid ? null : library.uid);
                      setGrantProductId("");
                    }}
                  >
                    Conceder item
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2 text-[11px]"
                  onClick={() => toggle(library.uid)}
                >
                  {open ? "Ocultar itens" : "Ver itens"}
                </button>
              </div>
            </div>

            {grantUid === library.uid && (
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <div className="min-w-64 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Item digital ainda não concedido
                  </p>
                  <SelectInput
                    value={grantProductId}
                    options={[
                      { value: "", label: options.length ? "Escolha um item…" : "Nada a conceder" },
                      ...options,
                    ]}
                    onChange={setGrantProductId}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 text-[11px]"
                  disabled={digital.busy}
                  onClick={() => void handleGrant(library)}
                >
                  {digital.busy ? "Concedendo…" : "Conceder acesso"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-4 py-2 text-[11px]"
                  onClick={() => {
                    setGrantUid(null);
                    setGrantProductId("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}

            {open && (
              <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                {library.items.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Sem itens — nenhum acesso concedido a este cliente.
                  </p>
                )}

                {library.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-xs font-bold">
                        {item.title}
                        {item.missing && (
                          <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)]">
                            {item.productId}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Label
                          tone={
                            item.type === "audiobook"
                              ? "border-violet-soft/50 text-violet-soft"
                              : "border-gold/50 bg-gold/10 text-gold"
                          }
                        >
                          {item.type === "audiobook" ? "audiobook" : "e-book"}
                        </Label>
                        <Label>{item.allowDownload ? "download liberado" : "streaming"}</Label>
                        <Label>concedido em {when(item.purchasedAt)}</Label>
                        {item.missing && (
                          <Label tone="border-[#e5484d]/50 text-[#e5484d]">fora do catálogo</Label>
                        )}
                      </div>
                      <ProgressLine item={item} />
                      {!item.progress && (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Sem progresso registrado ainda.
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-start justify-end">
                        <button
                          type="button"
                          className="btn btn-ghost px-3 py-2 text-[11px]"
                          disabled={digital.busy}
                          onClick={() => void handleRevoke(library, item)}
                        >
                          Revogar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
