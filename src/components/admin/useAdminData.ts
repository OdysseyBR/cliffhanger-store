"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  fetchFinance,
  fetchReport,
  fetchSettings,
  saveSettings,
  type AdminResult,
} from "@/components/admin/admin-api";
import type { FinanceSummary, ReportSummary, ShopSettings } from "@/lib/types";

/**
 * §12 — hooks do grupo Dados (Relatórios, Financeiro e Configurações):
 * leitura agregada por `/api/admin/*` com filtro de período, resultado
 * "taggeado" com o uid, igual aos demais hooks do painel.
 */

interface Failed {
  uid: string;
  message: string;
}

function loadError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

export interface AdminReport {
  report: ReportSummary | null;
  error: string | null;
  loading: boolean;
  days: number;
  setDays: (days: number) => void;
  reload: () => void;
}

export function useAdminReport(): AdminReport {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; days: number; report: ReportSummary } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [days, setDays] = useState(30);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchReport(days);
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, days, report: result.data.report });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao gerar o relatório.") });
      }
    })();
  }, [uid, days, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const current = uid !== null && loaded?.uid === uid && loaded?.days === days ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    report: current?.report ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    days,
    setDays,
    reload,
  };
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export interface AdminFinance {
  finance: FinanceSummary | null;
  error: string | null;
  loading: boolean;
  days: number;
  setDays: (days: number) => void;
  reload: () => void;
}

export function useAdminFinance(): AdminFinance {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; days: number; finance: FinanceSummary } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [days, setDays] = useState(30);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchFinance(days);
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, days, finance: result.data.finance });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao ler o financeiro.") });
      }
    })();
  }, [uid, days, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const current = uid !== null && loaded?.uid === uid && loaded?.days === days ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    finance: current?.finance ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    days,
    setDays,
    reload,
  };
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

export interface AdminSettings {
  settings: ShopSettings | null;
  isDefault: boolean;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (settings: ShopSettings) => Promise<AdminResult<{ ok: boolean; settings: ShopSettings }>>;
}

export function useAdminSettings(): AdminSettings {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; settings: ShopSettings; isDefault: boolean } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchSettings();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, settings: result.data.settings, isDefault: result.data.defaults === true });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao ler as configurações.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (settings: ShopSettings) => {
    setBusy(true);
    const result = await saveSettings(settings);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    settings: current?.settings ?? null,
    isDefault: current?.isDefault ?? false,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
  };
}
