"use client";

import { useStore } from "@/components/Providers";

/** Toasts globais (feedback de carrinho, wishlist e autenticação). */
export function ToastHost() {
  const { toasts, dismissToast } = useStore();

  // P0.3: a região viva fica sempre no DOM — um live region montado junto com
  // o conteúdo não é anunciado por leitores de tela. O wrapper continua
  // inerte (pointer-events-none) e cada toast reativa os eventos.
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          role={toast.tone === "error" ? "alert" : undefined}
          onClick={() => dismissToast(toast.id)}
          className={`pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
            toast.tone === "success"
              ? "bg-[#30a46c] text-white"
              : toast.tone === "error"
                ? "bg-[#e5484d] text-white"
                : "bg-violet text-white"
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
