"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getClientAuth, getClientDb, firebaseEnabled } from "@/lib/firebase";
import {
  getStoreSnapshot,
  subscribeStore,
  updateStore,
  SERVER_STATE,
  type ThemeName,
} from "@/lib/client-store";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type { ThemeName };

export interface Toast {
  id: number;
  message: string;
  tone?: "info" | "success" | "error";
}

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface StoreValue {
  // carrinho
  cart: { productId: string; qty: number }[];
  cartCount: number;
  addToCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  // wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWished: (productId: string) => boolean;
  // toasts
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  // tema (Theme Engine — Default / Summer Fest)
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  // autenticação
  user: SessionUser | null;
  authLoading: boolean;
  authError: string | null;
  firebaseReady: boolean;
  signInGoogle: () => Promise<void>;
  signInFacebook: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <Providers>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function Providers({ children }: { children: ReactNode }) {
  const persisted = useSyncExternalStore(subscribeStore, getStoreSnapshot, () => SERVER_STATE);
  const { cart, wishlist, theme } = persisted;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  // sem Firebase configurado, já nasce `false` (evita setState síncrono no efeito)
  const [authLoading, setAuthLoading] = useState(firebaseEnabled);
  const [authError, setAuthError] = useState<string | null>(null);

  // aplica o tema no <html> (DOM = sistema externo, sem setState)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // autenticação Firebase
  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (u: User | null) => {
      setUser(
        u
          ? {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
            }
          : null,
      );
      setAuthLoading(false);
    });
  }, []);

  // sincroniza wishlist com o perfil (best-effort)
  useEffect(() => {
    const db = getClientDb();
    if (!user || !db) return;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
        const remote = Array.isArray(data.wishlist) ? (data.wishlist as string[]) : [];
        const merged = Array.from(new Set([...wishlist, ...remote]));
        if (merged.length !== wishlist.length) updateStore({ wishlist: merged });
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email,
            displayName: user.displayName ?? "",
            photoURL: user.photoURL ?? "",
            wishlist: merged,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch {
        /* offline ou permissão — segue com o estado local */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToCart = useCallback(
    (productId: string, qty = 1) => {
      const { cart: current } = getStoreSnapshot();
      const found = current.find((i) => i.productId === productId);
      updateStore({
        cart: found
          ? current.map((i) =>
              i.productId === productId ? { ...i, qty: Math.min(i.qty + qty, 99) } : i,
            )
          : [...current, { productId, qty }],
      });
      notify("Adicionado ao carrinho", "success");
    },
    [notify],
  );

  const setQty = useCallback((productId: string, qty: number) => {
    const { cart: current } = getStoreSnapshot();
    updateStore({
      cart:
        qty <= 0
          ? current.filter((i) => i.productId !== productId)
          : current.map((i) => (i.productId === productId ? { ...i, qty } : i)),
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    const { cart: current } = getStoreSnapshot();
    updateStore({ cart: current.filter((i) => i.productId !== productId) });
  }, []);

  const clearCart = useCallback(() => updateStore({ cart: [] }), []);

  const toggleWishlist = useCallback(
    (productId: string) => {
      const { wishlist: current } = getStoreSnapshot();
      const has = current.includes(productId);
      updateStore({
        wishlist: has ? current.filter((id) => id !== productId) : [...current, productId],
      });
      notify(has ? "Removido da wishlist" : "Salvo na wishlist", "info");
    },
    [notify],
  );

  const isWished = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  );

  const setTheme = useCallback((next: ThemeName) => updateStore({ theme: next }), []);

  // ---- auth actions ----
  const runAuth = useCallback(
    async (action: () => Promise<unknown>, successMessage?: string) => {
      setAuthError(null);
      try {
        await action();
        if (successMessage) notify(successMessage, "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message.replace("auth/", "") : "Falha na autenticação";
        setAuthError(message);
        notify(message, "error");
        throw error;
      }
    },
    [notify],
  );

  const signInGoogle = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) throw new Error("Firebase não configurado");
    await runAuth(() => signInWithPopup(auth, new GoogleAuthProvider()), "Login realizado");
  }, [runAuth]);

  const signInFacebook = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) throw new Error("Firebase não configurado");
    if (!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
      throw new Error("App ID do Facebook não configurado");
    }
    await runAuth(() => signInWithPopup(auth, new FacebookAuthProvider()), "Login realizado");
  }, [runAuth]);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      const auth = getClientAuth();
      if (!auth) throw new Error("Firebase não configurado");
      await runAuth(() => signInWithEmailAndPassword(auth, email, password), "Login realizado");
    },
    [runAuth],
  );

  const registerEmail = useCallback(
    async (email: string, password: string) => {
      const auth = getClientAuth();
      if (!auth) throw new Error("Firebase não configurado");
      await runAuth(
        () => createUserWithEmailAndPassword(auth, email, password),
        "Conta Cliffhanger criada",
      );
    },
    [runAuth],
  );

  const logout = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) return;
    await runAuth(() => signOut(auth), "Sessão encerrada");
  }, [runAuth]);

  const value = useMemo<StoreValue>(
    () => ({
      cart,
      cartCount: cart.reduce((sum, i) => sum + i.qty, 0),
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      wishlist,
      toggleWishlist,
      isWished,
      toasts,
      notify,
      dismissToast,
      theme,
      setTheme,
      user,
      authLoading,
      authError,
      firebaseReady: firebaseEnabled,
      signInGoogle,
      signInFacebook,
      signInEmail,
      registerEmail,
      logout,
    }),
    [
      cart,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      wishlist,
      toggleWishlist,
      isWished,
      toasts,
      notify,
      dismissToast,
      theme,
      setTheme,
      user,
      authLoading,
      authError,
      signInGoogle,
      signInFacebook,
      signInEmail,
      registerEmail,
      logout,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
