"use client";

import { useStore } from "@/components/Providers";

/** Toasts globais (feedback de carrinho, wishlist e autenticação). */
export function ToastHost() {
  const { toasts, dismissToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
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
