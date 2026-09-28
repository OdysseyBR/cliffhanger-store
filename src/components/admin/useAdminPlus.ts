"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  deleteClubBox,
  deleteDrop,
  deleteQrCode,
  fetchAppContent,
  fetchPlusBoard,
  fetchPlusClub,
  fetchPlusDrops,
  fetchQrCodes,
  saveAppContent,
  saveClubBox,
  saveDrop,
  savePlusPlans,
  saveQrCode,
  type AdminResult,
  type PlusBoardResponse,
  type QrListResponse,
} from "@/components/admin/admin-api";
import type { AdminDropRow, ClubBox, DropClaim, PlusDrop, PlusPlan } from "@/lib/plus-fields";
import type { AppContent } from "@/lib/app-content";
import type { QrCatalogOption, QrCodeEntry } from "@/lib/qr-fields";

/**
 * §24–§26/§33/§34 — hooks dos módulos novos do painel (Cliffhanger+,
 * Aplicativo e QR Codes): lista e CRUD por `/api/admin/*`, resultado
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
// Cliffhanger+ · Planos (§24)
// ---------------------------------------------------------------------------

export interface AdminPlusBoard {
  board: PlusBoardResponse | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (
    plans: PlusPlan[],
  ) => Promise<AdminResult<{ ok: boolean; changed?: boolean; plans: PlusPlan[] }>>;
}

export function useAdminPlusBoard(): AdminPlusBoard {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; board: PlusBoardResponse } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchPlusBoard();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, board: result.data });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar o Cliffhanger+.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (plans: PlusPlan[]) => {
    setBusy(true);
    const result = await savePlusPlans(plans);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    board: current?.board ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
  };
}

// ---------------------------------------------------------------------------
// Cliffhanger+ · Drops (§25)
// ---------------------------------------------------------------------------

export interface AdminPlusDrops {
  items: AdminDropRow[] | null;
  claims: DropClaim[] | null;
  options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] } | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (
    drop: PlusDrop,
    isNew: boolean,
  ) => Promise<AdminResult<{ ok: boolean; item: PlusDrop }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean; claimsRemoved?: number }>>;
}

export function useAdminPlusDrops(): AdminPlusDrops {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{
    uid: string;
    items: AdminDropRow[];
    claims: DropClaim[];
    options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] };
  } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchPlusDrops();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({
          uid,
          items: result.data.items ?? [],
          claims: result.data.claims ?? [],
          options: result.data.options ?? { obras: [], produtos: [] },
        });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar os Drops.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (drop: PlusDrop, isNew: boolean) => {
    setBusy(true);
    const result = await saveDrop(drop, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteDrop(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    items: current?.items ?? null,
    claims: current?.claims ?? null,
    options: current?.options ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
    remove,
  };
}

// ---------------------------------------------------------------------------
// Cliffhanger+ · Clube do Leitor (§26)
// ---------------------------------------------------------------------------

export interface AdminPlusClub {
  items: ClubBox[] | null;
  options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] } | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (box: ClubBox, isNew: boolean) => Promise<AdminResult<{ ok: boolean; item: ClubBox }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminPlusClub(): AdminPlusClub {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{
    uid: string;
    items: ClubBox[];
    options: { obras: QrCatalogOption[]; produtos: QrCatalogOption[] };
  } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchPlusClub();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({
          uid,
          items: result.data.items ?? [],
          options: result.data.options ?? { obras: [], produtos: [] },
        });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar as caixas.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (box: ClubBox, isNew: boolean) => {
    setBusy(true);
    const result = await saveClubBox(box, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteClubBox(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    items: current?.items ?? null,
    options: current?.options ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
    remove,
  };
}

// ---------------------------------------------------------------------------
// Aplicativo (§33)
// ---------------------------------------------------------------------------

export interface AdminAppContent {
  content: AppContent | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (content: AppContent) => Promise<AdminResult<{ ok: boolean; content: AppContent }>>;
}

export function useAdminAppContent(): AdminAppContent {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; content: AppContent } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchAppContent();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, content: result.data.content });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar o aplicativo.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (content: AppContent) => {
    setBusy(true);
    const result = await saveAppContent(content);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    content: current?.content ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
  };
}

// ---------------------------------------------------------------------------
// QR Codes (§34)
// ---------------------------------------------------------------------------

export interface AdminQrCodes {
  list: QrListResponse | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  save: (
    item: QrCodeEntry,
    isNew: boolean,
  ) => Promise<AdminResult<{ ok: boolean; item: QrCodeEntry }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminQrCodes(): AdminQrCodes {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; list: QrListResponse } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchQrCodes();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, list: result.data });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar os QR Codes.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (item: QrCodeEntry, isNew: boolean) => {
    setBusy(true);
    const result = await saveQrCode(item, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteQrCode(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    list: current?.list ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
    remove,
  };
}
