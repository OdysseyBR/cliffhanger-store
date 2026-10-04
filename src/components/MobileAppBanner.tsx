"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconPhone, IconX } from "@/components/Icons";

const STORAGE_KEY = "ch:app-banner";
/** o aviso some por 30 dias depois que o usuário fecha. */
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
/** espera antes de mostrar — menos intrusivo que aparecer no primeiro frame. */
const SHOW_DELAY_MS = 1200;

/**
 * Recomendação do app pra quem visita o site no celular (Etapa M).
 * - só Android (não existe build iOS; APK não instalaria em iPhone);
 * - escondida na própria página /download;
 * - "X" grava a preferência por 30 dias no localStorage;
 * - renderiza só no cliente (estado inicial `false`) — sem divergência de hidratação.
 */
export function MobileAppBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const current = pathname.replace(/\/+$/, "") || "/";
  const onDownload = current === "/download";

  useEffect(() => {
    if (onDownload) return;
    if (!/Android/i.test(navigator.userAgent)) return;
    try {
      const dismissedAt = Number(localStorage.getItem(STORAGE_KEY));
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;
    } catch {
      /* storage pode estar bloqueado — segue sem persistir */
    }
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, onDownload]);

  if (!visible || onDownload) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* storage pode estar bloqueado — só não persiste */
    }
  };

  return (
    <div
      data-testid="app-banner"
      role="region"
      aria-label="Recomendação do app Cliffhanger"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface-raised)]"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#A30707] text-[#F8FEFF]">
          <IconPhone className="h-5 w-5" />
        </span>
        <p className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          <span className="font-bold">Cliffhanger tem app!</span>{" "}
          <span className="text-[var(--text-muted)]">
            No celular é melhor: leia, ouça e acompanhe pedidos no aplicativo.
          </span>
        </p>
        <Link href="/download" className="btn btn-primary shrink-0 px-4 py-2 text-xs sm:text-sm">
          Baixar
        </Link>
        <button
          type="button"
          onClick={dismiss}
          data-testid="app-banner-close"
          aria-label="Fechar aviso do app"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-[var(--surface-raised-2)]"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
