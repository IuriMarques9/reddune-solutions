import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Contact } from "@/components/sections/Contact";
import { getLocale, getMessages } from "next-intl/server";
import type { SiteMessages } from "@/types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = (await getMessages()) as unknown as SiteMessages;
  const title =
    (messages.TabTitles as Record<string, string> | undefined)?.contact ??
    "RedDune Solutions - Contacto";
  const description = messages.TabDescription ?? "Entre em contacto com a RedDune Solutions.";

  return {
    title,
    description,
    alternates: { canonical: "/contacto" },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: "/contacto",
      siteName: "Reddune Solutions",
    },
  };
}

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-20">
        <Suspense fallback={null}>
          <Contact />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
