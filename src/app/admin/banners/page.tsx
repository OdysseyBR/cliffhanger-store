"use client";

import { useState } from "react";
import { useStore } from "@/components/Providers";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { BannerEditor } from "@/components/admin/BannerEditor";
import { deleteBanner, saveBanner } from "@/components/admin/admin-api";
import { useAdminBanners } from "@/components/admin/useAdminBanners";
import { useAdminProducts } from "@/components/admin/useAdminProducts";
import { bannerHref, destinationLabel } from "@/lib/banner-fields";
import type { Banner } from "@/lib/types";

/**
 * Módulo Banners do painel (Documento de Correção §5) — arte final única
 * por upload, com ativação, destino, ordenação e agendamento. Sem construtor
 * de banner: o site nunca monta a arte em camadas.
 */
export default function AdminBannersPage() {
  const { user, notify } = useStore();
  const { banners, loading, error, reload } = useAdminBanners();
  const { products, works } = useAdminProducts();
  const [editing, setEditing] = useState<Banner | "novo" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleToggle(banner: Banner) {
    setBusyId(banner.id);
    const result = await saveBanner({ ...banner, active: !banner.active }, false);
    setBusyId(null);
    if (result.ok) {
      notify(banner.active ? "Banner desativado" : "Banner ativado", "success");
      reload();
    } else {
      notify(result.message, "error");
    }
  }

  async function handleDelete(banner: Banner) {
    if (!window.confirm(`Excluir "${banner.name}"? A loja volta a exibir o banner padrão.`)) {
      return;
    }
    setBusyId(banner.id);
    const result = await deleteBanner(banner.id);
    setBusyId(null);
    if (result.ok) {
      notify("Banner excluído", "success");
      reload();
    } else {
      notify(result.message, "error");
    }
  }

  if (!user) return <AdminLogin note="Entre com a conta administradora para gerenciar os banners." />;

  const sorted = banners ? [...banners].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-display text-3xl text-gold">Banners</p>
          <p className="text-xs text-[var(--text-muted)]">
            Arte final única por upload — exibição, destino, ativação, ordenação e agendamento (§5)
            {banners ? ` · ${banners.length} cadastrados` : ""}
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-[11px]"
            onClick={() => setEditing("novo")}
          >
            Novo banner
          </button>
        )}
      </div>

      {editing !== null && (
        <BannerEditor
          key={editing === "novo" ? "novo" : editing.id}
          initial={editing === "novo" ? null : editing}
          products={products ?? []}
          works={works}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading && <p className="text-sm text-[var(--text-muted)]">Carregando banners…</p>}
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}

      {!loading && !error && sorted.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhum banner criado — a loja está exibindo o banner padrão.
        </p>
      )}

      {sorted.map((banner) => (
        <div key={banner.id} className="card flex flex-wrap items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia da arte enviada pelo admin */}
          <img
            src={banner.image}
            alt=""
            aria-hidden
            className="h-14 w-28 shrink-0 rounded border border-[var(--border)] object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{banner.name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {destinationLabel(banner.destinationType)} · {bannerHref(banner)} · ordem {banner.order}
              {banner.fullscreen ? " · fullscreen" : ""}
              {!banner.showHeader ? " · somente banner" : ""}
              {banner.startsAt || banner.endsAt ? " · agendado" : ""}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{banner.alt}</p>
          </div>
          <span
            className={
              banner.active
                ? "shrink-0 rounded-full bg-gold px-3 py-1 text-[10px] font-extrabold text-ink"
                : "shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-bold text-[var(--text-muted)]"
            }
          >
            {banner.active ? "ATIVO" : "INATIVO"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-[11px]"
              onClick={() => setEditing(banner)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-[11px]"
              disabled={busyId === banner.id}
              onClick={() => void handleToggle(banner)}
            >
              {busyId === banner.id
                ? "Salvando…"
                : banner.active
                  ? "Desativar"
                  : "Ativar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-[11px] text-[#e5484d]"
              disabled={busyId === banner.id}
              onClick={() => void handleDelete(banner)}
            >
              {busyId === banner.id ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
