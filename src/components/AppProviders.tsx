import { Providers } from "@/components/Providers";
import { ThemeSync } from "@/components/ThemeSync";
import { ToastHost } from "@/components/ToastHost";

/** Provider raiz: estado global (carrinho, wishlist, auth, tema) + toasts. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ThemeSync />
      {children}
      <ToastHost />
    </Providers>
  );
}
