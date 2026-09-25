import type { Metadata } from "next";
import { Bebas_Neue, Barlow } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ProvidersShell";
import { SiteFooter } from "@/components/SiteFooter";
import { themeCss } from "@/lib/theme-css";
import { getActiveTheme, getThemes } from "@/lib/themes";

const displayFace = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const bodyFace = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body-face",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Revalidação periódica do layout: mantém o HTML do shell atualizado
 * sem novo deploy (padrões visuais via html[data-theme=…]).
 */
export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cliffhanger Store — livros, e-books, audiobooks e colecionáveis",
    template: "%s | Cliffhanger Store",
  },
  description:
    "A loja do Cliffhanger Universo: livros, e-books, audiobooks, produtos oficiais e colecionáveis dos seus universos favoritos.",
  keywords: [
    "cliffhanger",
    "loja",
    "livros",
    "ebooks",
    "audiobooks",
    "coleccionáveis",
    "universos",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Cliffhanger Store",
    title: "Cliffhanger Store — livros, e-books, audiobooks e colecionáveis",
    description:
      "Livros, e-books, audiobooks, produtos oficiais e colecionáveis dos seus universos favoritos.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [activeTheme, themes] = await Promise.all([getActiveTheme(), getThemes()]);
  const engineCss = themeCss(themes.filter((t) => t.status !== "arquivado"));

  // As variáveis das fontes (next/font) vão no <html>: :root/@theme
  // referenciam --font-display-face/--font-body-face — se estivessem só
  // no <body>, a resolução em html seria inválida e as fontes nunca
  // chegariam a carregar (bug de tipografia do site inteiro).
  return (
    <html
      lang="pt-BR"
      data-theme={activeTheme.key}
      className={`${displayFace.variable} ${bodyFace.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        {/* CSS dos modelos — React 19 move para o <head> preservando a ordem */}
        <style
          href="theme-engine"
          precedence="theme-engine"
          dangerouslySetInnerHTML={{ __html: engineCss }}
        />
        <Providers>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
