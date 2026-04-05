import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Portfolio } from "@/components/sections/Portfolio";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const messages: AbstractIntlMessages = await getMessages({ locale });
  const messagesObj = messages as Record<string, any>;
  const title = messagesObj.TabTitles?.home;
  const description = messagesObj.TabDescription;
  return {
    title,
    description,
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
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
