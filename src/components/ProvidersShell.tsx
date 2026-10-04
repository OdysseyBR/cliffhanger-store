import { AppProviders } from "@/components/AppProviders";
import { MobileAppBanner } from "@/components/MobileAppBanner";
import { ScrollToTop } from "@/components/ScrollToTop";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <ScrollToTop />
      {children}
      <MobileAppBanner />
    </AppProviders>
  );
}
