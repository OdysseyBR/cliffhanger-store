import type { Metadata } from "next";
import { Bebas_Neue, Barlow } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ProvidersShell";
import { SiteFooter } from "@/components/SiteFooter";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${displayFace.variable} ${bodyFace.variable} antialiased`}
        suppressHydrationWarning
      >
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
