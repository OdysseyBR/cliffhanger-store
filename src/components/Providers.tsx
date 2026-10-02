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
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getClientAuth, getClientDb, firebaseEnabled } from "@/lib/firebase";
import {
  leaveSession,
  registerSession,
  resetSessionClock,
} from "@/lib/device";
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
  /** e-mail verificado pelo Firebase (9.5) */
  emailVerified: boolean;
  /** provedores vinculados: google.com, facebook.com, password… */
  providers: string[];
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
  // tema (Padrão Cliffhanger / Padrão Cliffhanger Claro)
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
  // segurança da conta (Doc Mestre 9.5)
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
  revokeSessions: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <Providers>");
  return ctx;
}

/**
 * Reautentica com senha (Etapa C). A SDK unifica senha errada como
 * `auth/invalid-credential`; nos formulários que pedem a senha ATUAL
 * (troca e exclusão) traduzimos para `auth/wrong-password` para o mapa
 * amigável exibir "Senha incorreta." — no login, `invalid-credential`
 * segue como "E-mail ou senha incorretos.", que ali está correto.
 */
async function reauthPassword(user: User, email: string, password: string): Promise<void> {
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      const mapped = new Error("Senha incorreta. (auth/wrong-password)");
      (mapped as Error & { code?: string }).code = "auth/wrong-password";
      throw mapped;
    }
    throw error;
  }
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

  // tema do <html> é gerenciado pelo <ThemeSync /> (filho): aplica o
  // override do usuário apenas quando houver; "" mantém o modelo ativo
  // vindo do servidor (data-theme={activeTheme.key} no layout).

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
              emailVerified: u.emailVerified,
              providers: u.providerData.map((provider) => provider.providerId),
            }
          : null,
      );
      setAuthLoading(false);
      // registra este dispositivo no registry de sessões (throttle 5 min)
      if (u) void registerSession();
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
        const raw = error instanceof Error ? error.message : "";
        const code = /\(auth\/([a-z-]+)\)/.exec(raw)?.[1] ?? raw.replace("auth/", "");
        const friendly: Record<string, string> = {
          "requires-recent-login":
            "Confirme sua identidade: faça login novamente para esta ação.",
          "no-password-provider":
            "Sua conta não usa senha (entrou por Google/Facebook).",
          "missing-password": "Informe sua senha atual para confirmar.",
          "wrong-password": "Senha incorreta.",
          "invalid-credential": "E-mail ou senha incorretos.",
          "popup-closed-by-user": "Reautenticação cancelada.",
          "cancelled-popup-request": "Reautenticação cancelada.",
          "weak-password": "Senha muito fraca — use pelo menos 6 caracteres.",
          "invalid-password": "Senha inválida.",
          "too-many-requests": "Muitas tentativas — tente novamente em instantes.",
        };
        const message = friendly[code] ?? (code || "Falha na autenticação");
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
      await runAuth(async () => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // verificação automática no cadastro (Etapa C) — melhor esforço: se
        // o envio falhar, o botão "Verificar e-mail agora" cobre o caso
        try {
          await sendEmailVerification(cred.user);
        } catch {
          /* sem e-mail agora — usuário pode reenviar depois */
        }
      }, "Conta Cliffhanger criada — confira seu e-mail de verificação");
    },
    [runAuth],
  );

  const logout = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) return;
    await runAuth(async () => {
      // apaga este sid do registry antes de sair (best-effort)
      await leaveSession();
      await signOut(auth);
    }, "Sessão encerrada");
  }, [runAuth]);

  // ---- segurança da conta (Doc Mestre 9.5) ----
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const auth = getClientAuth();
      const current = auth?.currentUser;
      if (!current) throw new Error("Nenhuma sessão ativa");
      const email = current.email;
      await runAuth(async () => {
        if (!email) {
          const error = new Error("Sua conta não usa senha (entrou por Google/Facebook).");
          (error as Error & { code?: string }).code = "auth/no-password-provider";
          throw error;
        }
        if (!currentPassword) {
          const error = new Error("Informe sua senha atual para confirmar.");
          (error as Error & { code?: string }).code = "auth/missing-password";
          throw error;
        }
        // reautenticação inline exigida pelo Firebase para ações críticas
        await reauthPassword(current, email, currentPassword);
        await updatePassword(current, newPassword);
      }, "Senha alterada");
    },
    [runAuth],
  );

  const sendReset = useCallback(
    async (email: string) => {
      const auth = getClientAuth();
      if (!auth) throw new Error("Firebase não configurado");
      await runAuth(() => sendPasswordResetEmail(auth, email), "Link de recuperação enviado");
    },
    [runAuth],
  );

  const verifyEmail = useCallback(async () => {
    const auth = getClientAuth();
    const current = auth?.currentUser;
    if (!current) throw new Error("Nenhuma sessão ativa");
    await runAuth(() => sendEmailVerification(current), "Verificação enviada para seu e-mail");
  }, [runAuth]);

  const deleteAccount = useCallback(
    async (currentPassword?: string) => {
      const auth = getClientAuth();
      const current = auth?.currentUser;
      if (!current) throw new Error("Nenhuma sessão ativa");
      await runAuth(async () => {
        const hasPassword = current.providerData.some(
          (provider) => provider.providerId === "password",
        );
        if (hasPassword) {
          // reautenticação sempre exigida antes de excluir (Etapa C)
          if (!currentPassword) {
            const error = new Error("Informe sua senha atual para confirmar.");
            (error as Error & { code?: string }).code = "auth/missing-password";
            throw error;
          }
          if (!current.email) {
            const error = new Error("E-mail da conta ausente.");
            (error as Error & { code?: string }).code = "auth/no-password-provider";
            throw error;
          }
          await reauthPassword(current, current.email, currentPassword);
        } else {
          // contas só de Google/Facebook confirmam via popup
          const social = current.providerData.find(
            (provider) =>
              provider.providerId === "google.com" ||
              provider.providerId === "facebook.com",
          );
          if (!social) {
            const error = new Error("Sua conta não usa senha (entrou por Google/Facebook).");
            (error as Error & { code?: string }).code = "auth/no-password-provider";
            throw error;
          }
          const provider =
            social.providerId === "google.com"
              ? new GoogleAuthProvider()
              : new FacebookAuthProvider();
          await reauthenticateWithPopup(current, provider);
        }

        // exclusão completa server-side (Firestore + Auth + adminUsers)
        const idToken = await current.getIdToken();
        const res = await fetch("/api/account", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Não foi possível excluir a conta.");
        }

        // limpa os espelhos locais e encerra a sessão — updateStore primeiro
        // (ele persiste "[]" em ch:cart/ch:wishlist) e o removeItem por último,
        // para os espelhos realmente sumirem do storage
        updateStore({ cart: [], wishlist: [] });
        try {
          for (const key of ["ch:cart", "ch:library", "ch:progress", "ch:wishlist"]) {
            window.localStorage.removeItem(key);
          }
        } catch {
          /* storage indisponível */
        }
        resetSessionClock();
        await signOut(auth);
      }, "Conta excluída — seus dados foram removidos");
    },
    [runAuth],
  );

  const revokeSessions = useCallback(async () => {
    const auth = getClientAuth();
    const current = auth?.currentUser;
    if (!auth || !current) throw new Error("Nenhuma sessão ativa");
    await runAuth(async () => {
      // revoga refresh tokens + limpa o registry (9.5) — via API
      const idToken = await current.getIdToken();
      const res = await fetch("/api/account/sessions", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível encerrar as sessões.");
      }
      resetSessionClock();
      await signOut(auth);
    }, "Sessões encerradas em todos os dispositivos");
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
      changePassword,
      sendReset,
      verifyEmail,
      deleteAccount,
      revokeSessions,
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
      changePassword,
      sendReset,
      verifyEmail,
      deleteAccount,
      revokeSessions,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
