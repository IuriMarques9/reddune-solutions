import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";
import { Body } from "@/components/sections/pricingPage/Body";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const messages: AbstractIntlMessages = await getMessages({ locale });
  const title = messages.TabTitles?.pricing;
  const description = messages.TabDescription;
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
          <Body />
        </main>
        <Footer />
    </div>
  );
}

