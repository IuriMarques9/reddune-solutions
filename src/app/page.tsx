import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Portfolio } from "@/components/sections/Portfolio";
import { About } from "@/components/sections/About";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { getAllPortfolioItems } from "@/lib/mongodb/portfolio";
import { getLocale } from "next-intl/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = publicEnv.baseUrl;
  const isPt = locale !== "en";

  const title = isPt
    ? "RedDune Solutions — Assistência Técnica & Serviços Web no Algarve"
    : "RedDune Solutions — IT Support & Web Services in Algarve";
  const description = isPt
    ? "Assistência técnica informática, montagem de PCs, desenvolvimento web e recuperação de dados em Fuseta, Algarve. Serviço personalizado para particulares e empresas."
    : "Computer repair, PC assembly, web development and data recovery in Fuseta, Algarve. Personalised IT service for individuals and businesses.";

  return {
    title,
    description,
    keywords: isPt
      ? ["assistência técnica informática", "reparação computadores", "Fuseta", "Algarve", "serviços web", "recuperação de dados", "RedDune Solutions", "montagem PC"]
      : ["computer repair", "IT support", "Fuseta", "Algarve", "web services", "data recovery", "RedDune Solutions", "PC assembly"],
    alternates: {
      canonical: `${base}/`,
      languages: { pt: `${base}/`, en: `${base}/` },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `${base}/`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Home() {
  const portfolioItems = await getAllPortfolioItems();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <Portfolio items={portfolioItems} />
        <About />
        <ContactCTA />
      </main>
      <Footer />
    </div>
  );
}
