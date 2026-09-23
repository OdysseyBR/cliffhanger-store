import type { CartItem } from "@/lib/types";

/**
 * Store externo persistido (carrinho, wishlist, tema).
 *
 * Implementado como store externo + `useSyncExternalStore`, que é a forma
 * recomendada pelo React para dados vindos de `localStorage`: evita mismatch
 * de hidratação e efeitos que chamam `setState`.
 */

export type ThemeName = "default" | "summer";

export interface PersistedState {
  cart: CartItem[];
  wishlist: string[];
  theme: ThemeName;
}

export const SERVER_STATE: PersistedState = {
  cart: [],
  wishlist: [],
  theme: "default",
};

const KEYS = {
  cart: "ch:cart",
  wishlist: "ch:wishlist",
  theme: "ch:theme",
} as const;

let cache: PersistedState | null = null;
const listeners = new Set<() => void>();

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage indisponível (modo privado, SSR…) */
  }
}

export function getStoreSnapshot(): PersistedState {
  if (cache) return cache;
  if (typeof window === "undefined") return SERVER_STATE;

  cache = {
    cart: safeRead<CartItem[]>(KEYS.cart, []),
    wishlist: safeRead<string[]>(KEYS.wishlist, []),
    theme: safeRead<ThemeName>(KEYS.theme, "default"),
  };
  return cache;
}

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateStore(patch: Partial<PersistedState>): void {
  const current = getStoreSnapshot();
  const next: PersistedState = { ...current, ...patch };
  cache = next;

  safeWrite(KEYS.cart, next.cart);
  safeWrite(KEYS.wishlist, next.wishlist);
  safeWrite(KEYS.theme, next.theme);

  for (const listener of listeners) listener();
}
