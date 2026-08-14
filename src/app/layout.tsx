import "./globals.css";
import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Newsreader,
  DM_Sans,
  Geist_Mono,
} from "next/font/google";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { StructuredData } from "@/components/structured-data";
import { publicEnv } from "@/lib/env";

// === Oasis v5 fonts (Phase 1) ===
// Todas variáveis: sem array `weight`, o next/font serve UM ficheiro com o
// eixo wght inteiro em vez de um ficheiro por peso (menos requests/bytes).
// Display headings (variable, axes opsz + wght)
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  preload: true,
});

// Decorative italic only inside display headings (em tags)
const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  style: ["italic"],
  preload: false,
});

// Body copy (default font-family)
const body = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  preload: true,
});

// Eyebrows, meta, coordinates
const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.baseUrl),
  // Default só usado por páginas sem title próprio (ex.: not-found).
  title: {
    default: "RedDune Solutions — Fuseta, Algarve",
    template: "%s",
  },
  appleWebApp: {
    capable: true,
    title: "RedDune",
    statusBarStyle: "default",
  },
  icons: {
    // favicon.ico (multi-tamanho 16/32/48, BMP) é servido automaticamente
    // pelo App Router; os PNG são fallback explícito p/ browsers e Google.
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    siteName: "RedDune Solutions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#d6422a",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale();

  // Só os namespaces consumidos por componentes CLIENTE vão no payload RSC —
  // o resto renderiza no servidor e não precisa de viajar até ao browser
  // (poupa ~30KB de HTML por página). Se um novo componente "use client"
  // usar useTranslations com outro namespace, adicioná-lo aqui.
  const m = messages as Record<string, unknown>;
  const clientMessages = {
    A11y: m.A11y,
    Navigation: m.Navigation,
    Footer: m.Footer,
    HomePage: {
      ContactSection: (m.HomePage as Record<string, unknown> | undefined)
        ?.ContactSection,
    },
    PortfolioPage: m.PortfolioPage,
    ShopPage: m.ShopPage,
  } as typeof messages;

  return (
    <html
      lang={locale}
      className={cn(
        display.variable,
        serif.variable,
        body.variable,
        mono.variable,
        "!scroll-smooth"
      )}
    >
      {/* Toaster/ConfirmProvider/RdLoaderFirstPaint saíram deste layout: o
          overlay do loader escondia todo o SSR das páginas públicas (LCP) e o
          Radix Dialog/Toast pesava no bundle público. Vivem agora no layout do
          (painel); o Toaster também monta em /contacto (form usa toasts). */}
      <body className={cn("font-body antialiased")}>
        <ServiceWorkerRegister />
        <StructuredData />
        <NextIntlClientProvider messages={clientMessages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
