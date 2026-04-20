import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getLocale } from "next-intl/server";
import { Body } from "@/components/sections/pricingPage/Body";
import { PricingHero } from "@/components/sections/pricingPage/PricingHero";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = publicEnv.baseUrl;
  const isPt = locale !== "en";

  const title = isPt
    ? "Serviços & Preços — RedDune Solutions | Algarve"
    : "Services & Pricing — RedDune Solutions | Algarve";
  const description = isPt
    ? "Preços de assistência técnica, formatação, limpeza, montagem de PCs e desenvolvimento web em Fuseta, Algarve. Transparência total sem surpresas."
    : "Pricing for IT support, formatting, cleaning, PC assembly and web development in Fuseta, Algarve. Full transparency, no surprises.";

  return {
    title,
    description,
    keywords: isPt
      ? ["preços assistência técnica", "montagem PC", "desenvolvimento web Portugal", "serviços informáticos", "Algarve", "Fuseta"]
      : ["IT support pricing", "PC assembly", "web development Portugal", "computer services", "Algarve", "Fuseta"],
    alternates: {
      canonical: `${base}/servicos`,
      languages: { pt: `${base}/servicos`, en: `${base}/servicos` },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `${base}/servicos`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ServicosPage() {
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
