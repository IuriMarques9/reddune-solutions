import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ShopHero } from "@/components/sections/shop/ShopHero";
import { ProductGrid } from "@/components/sections/shop/ProductGrid";
import { getAllProducts } from "@/lib/mongodb/products";
import { getLocale, getMessages } from "next-intl/server";
import type { SiteMessages } from "@/types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = (await getMessages()) as unknown as SiteMessages;
  const title =
    (messages.TabTitles as Record<string, string> | undefined)?.shop ??
    "RedDune Solutions - Loja";
  const description =
    messages.TabDescription ??
    "Loja de computadores, componentes e acessórios.";

  return {
    title,
    description,
    alternates: { canonical: "/loja" },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: "/loja",
      siteName: "Reddune Solutions",
    },
  };
}

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <ShopHero />
        <section className="py-12 md:py-20 bg-secondary/50">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ProductGrid products={products} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
