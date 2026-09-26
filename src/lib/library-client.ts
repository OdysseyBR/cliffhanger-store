import { getClientAuth } from "@/lib/firebase";
import type { LibraryItem, ReadingProgress } from "@/lib/types";

/**
 * Cliente da biblioteca digital (§8).
 *
 * Com conta logada: sincroniza com Firestore via `/api/library`.
 * Visitante: mantém itens em `ch:library` e progresso em `ch:progress`
 * (mesmo formato do ReadingProgress) — entre na conta para sincronizar.
 */

const LIBRARY_KEY = "ch:library";
const PROGRESS_KEY = "ch:progress";

type ProgressRecord = Record<string, ReadingProgress>;

export function localLibraryIds(): string[] {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function addLocalLibraryIds(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    const merged = Array.from(new Set([...localLibraryIds(), ...ids]));
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(merged));
  } catch {
    /* storage indisponível */
  }
}

async function getIdToken(): Promise<string | null> {
  try {
    return (await getClientAuth()?.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

/** Lê itens + progresso da conta. `null` = sem sessão/Firestore (use local). */
export async function fetchLibrary(): Promise<{
  items: LibraryItem[];
  progress: ProgressRecord;
} | null> {
  const token = await getIdToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/library", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: LibraryItem[]; progress?: ProgressRecord };
    return { items: data.items ?? [], progress: data.progress ?? {} };
  } catch {
    return null;
  }
}

/** Envia compras locais (visitante) para a conta. Retorna qtd sincronizada. */
export async function claimLocalLibrary(): Promise<number> {
  const ids = localLibraryIds();
  const token = await getIdToken();
  if (ids.length === 0 || !token) return 0;
  try {
    const res = await fetch("/api/library", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productIds: ids }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { claimed?: number };
    return data.claimed ?? 0;
  } catch {
    return 0;
  }
}

function readLocalProgresses(): ProgressRecord {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as ProgressRecord) : {};
  } catch {
    return {};
  }
}

export function readLocalProgress(productId: string): ReadingProgress | null {
  return readLocalProgresses()[productId] ?? null;
}

/** Espelho local do progresso (visitante usa direto; logado guarda cópia). */
export function writeLocalProgress(progress: ReadingProgress): void {
  try {
    const record = readLocalProgresses();
    record[progress.productId] = progress;
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(record));
  } catch {
    /* storage indisponível */
  }
}

/**
 * Persiste progresso: na conta (Firestore) quando há sessão e sempre
 * espelha localmente. Retorna `true` quando sincronizou com a conta.
 */
export async function saveProgress(
  progress: ReadingProgress,
): Promise<boolean> {
  writeLocalProgress(progress);
  const token = await getIdToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `/api/library/progress/${encodeURIComponent(progress.productId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(progress),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
