import { AppProviders } from "@/components/AppProviders";
import { ScrollToTop } from "@/components/ScrollToTop";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <ScrollToTop />
      {children}
    </AppProviders>
  );
}
