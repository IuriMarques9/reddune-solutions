import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Portfolio } from "@/components/sections/Portfolio";
import { About } from "@/components/sections/About";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { getLocale, getMessages } from "next-intl/server";
import type { SiteMessages } from "@/types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = (await getMessages()) as unknown as SiteMessages;
  const title = messages.TabTitles?.home ?? "Reddune Solutions";
  const description =
    messages.TabDescription ??
    "Assistência técnica, serviços web e recuperação de dados.";

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: "/",
      siteName: "Reddune Solutions",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <Portfolio />
        <About />
        <ContactCTA />
      </main>
      <Footer />
    </div>
  );
}
