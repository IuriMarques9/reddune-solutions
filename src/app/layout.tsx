import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { StructuredData } from "@/components/structured-data";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.baseUrl),
  openGraph: {
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    siteName: "Reddune Solutions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={cn("!scroll-smooth")}
    >
      <body className={cn("font-body antialiased")}>
        <StructuredData />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
