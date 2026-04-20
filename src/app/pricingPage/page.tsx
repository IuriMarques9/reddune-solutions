import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getLocale, getMessages } from "next-intl/server";
import { Body } from "@/components/sections/pricingPage/Body";
import { PricingHero } from "@/components/sections/pricingPage/PricingHero";
import type { SiteMessages } from "@/types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = (await getMessages()) as unknown as SiteMessages;
  const title = messages.TabTitles?.pricing ?? "Preços - Reddune Solutions";
  const description =
    messages.TabDescription ??
    "Preços de assistência técnica e serviços web.";

  return {
    title,
    description,
    alternates: { canonical: "/pricingPage" },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: "/pricingPage",
      siteName: "Reddune Solutions",
    },
  };
}

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <PricingHero />
        <Body />
      </main>
      <Footer />
    </div>
  );
}
