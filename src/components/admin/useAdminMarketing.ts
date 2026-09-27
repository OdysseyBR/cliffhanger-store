"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/Providers";
import {
  adjustClubPoints,
  deleteBenefit,
  deleteNotification,
  deletePromotion,
  deleteReview,
  fetchClub,
  fetchNotifications,
  fetchPromotions,
  fetchReviews,
  moderateReview,
  saveBenefit,
  saveNotification,
  savePromotion,
  type AdminResult,
} from "@/components/admin/admin-api";
import type {
  ClubBenefit,
  ClubMember,
  Promotion,
  Review,
  StoreNotification,
} from "@/lib/types";

/**
 * §12 — hooks do grupo Marketing (Promoções §16, Club §18, Avaliações §19
 * e Notificações §16): lista e CRUD por `/api/admin/*`, resultado
 * "taggeado" com o uid, igual aos demais hooks do painel.
 */

interface Failed {
  uid: string;
  message: string;
}

interface Crud<T> {
  items: T[] | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
}

function loadError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// Promoções (§16)
// ---------------------------------------------------------------------------

export interface AdminPromotions extends Crud<Promotion> {
  save: (promotion: Promotion, isNew: boolean) => Promise<AdminResult<{ ok: boolean; changed?: boolean; item: Promotion }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminPromotions(): AdminPromotions {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; items: Promotion[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchPromotions();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, items: result.data.items ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar as promoções.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (promotion: Promotion, isNew: boolean) => {
    setBusy(true);
    const result = await savePromotion(promotion, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deletePromotion(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    items: current?.items ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
    remove,
  };
}

// ---------------------------------------------------------------------------
// Club (§18)
// ---------------------------------------------------------------------------

export interface AdminClub {
  members: ClubMember[] | null;
  benefits: ClubBenefit[] | null;
  error: string | null;
  loading: boolean;
  busy: boolean;
  reload: () => void;
  adjust: (uid: string, delta: number, reason: string) => Promise<AdminResult<{ ok: boolean; member: ClubMember }>>;
  saveBenefit: (benefit: ClubBenefit, isNew: boolean) => Promise<AdminResult<{ ok: boolean; item: ClubBenefit }>>;
  removeBenefit: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminClub(): AdminClub {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; members: ClubMember[]; benefits: ClubBenefit[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchClub();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, members: result.data.members ?? [], benefits: result.data.benefits ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar o clube.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const adjust = useCallback(async (target: string, delta: number, reason: string) => {
    setBusy(true);
    const result = await adjustClubPoints(target, { delta, reason });
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const saveBenefitCb = useCallback(async (benefit: ClubBenefit, isNew: boolean) => {
    setBusy(true);
    const result = await saveBenefit(benefit, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const removeBenefit = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteBenefit(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    members: current?.members ?? null,
    benefits: current?.benefits ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    adjust,
    saveBenefit: saveBenefitCb,
    removeBenefit,
  };
}

// ---------------------------------------------------------------------------
// Avaliações (§19)
// ---------------------------------------------------------------------------

export interface AdminReviews extends Crud<Review> {
  moderate: (id: string, status: Review["status"]) => Promise<AdminResult<{ ok: boolean; changed: boolean; item: Review }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminReviews(): AdminReviews {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; items: Review[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchReviews();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, items: result.data.items ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar as avaliações.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const moderate = useCallback(async (id: string, status: Review["status"]) => {
    setBusy(true);
    const result = await moderateReview(id, status);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteReview(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    items: current?.items ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    moderate,
    remove,
  };
}

// ---------------------------------------------------------------------------
// Notificações (§16)
// ---------------------------------------------------------------------------

export interface AdminNotifications extends Crud<StoreNotification> {
  save: (item: StoreNotification, isNew: boolean) => Promise<AdminResult<{ ok: boolean; item: StoreNotification }>>;
  remove: (id: string) => Promise<AdminResult<{ ok: boolean }>>;
}

export function useAdminNotifications(): AdminNotifications {
  const { user, authLoading } = useStore();
  const uid = user?.uid ?? null;

  const [loaded, setLoaded] = useState<{ uid: string; items: StoreNotification[] } | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      try {
        const result = await fetchNotifications();
        if (!result.ok) {
          setLoaded(null);
          setFailed({ uid, message: result.message });
          return;
        }
        setFailed(null);
        setLoaded({ uid, items: result.data.items ?? [] });
      } catch (error) {
        setLoaded(null);
        setFailed({ uid, message: loadError(error, "Falha ao carregar as notificações.") });
      }
    })();
  }, [uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const save = useCallback(async (item: StoreNotification, isNew: boolean) => {
    setBusy(true);
    const result = await saveNotification(item, isNew);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusy(true);
    const result = await deleteNotification(id);
    setBusy(false);
    if (result.ok) setReloadKey((key) => key + 1);
    return result;
  }, []);

  const current = uid !== null && loaded?.uid === uid ? loaded : null;
  const currentError = uid !== null && failed?.uid === uid ? failed : null;

  return {
    items: current?.items ?? null,
    error: currentError?.message ?? null,
    loading: !authLoading && uid !== null && !current && !currentError,
    busy,
    reload,
    save,
    remove,
  };
}
