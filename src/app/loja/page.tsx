import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ShopHero } from "@/components/sections/shop/ShopHero";
import { ProductGrid } from "@/components/sections/shop/ProductGrid";
import { getAllProducts } from "@/lib/mongodb/products";
import { getLocale } from "next-intl/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = publicEnv.baseUrl;
  const isPt = locale !== "en";

  const title = isPt
    ? "Loja — RedDune Solutions | Computadores, Componentes e Acessórios"
    : "Shop — RedDune Solutions | Computers, Components & Accessories";
  const description = isPt
    ? "Compre computadores novos, recondicionados e segunda mão, componentes e acessórios em Fuseta, Algarve. Preços justos e qualidade garantida."
    : "Buy new, refurbished and second-hand computers, components and accessories in Fuseta, Algarve. Fair prices and guaranteed quality.";

  return {
    title,
    description,
    keywords: isPt
      ? ["loja informática", "comprar computador", "componentes PC", "segunda mão", "recondicionado", "Algarve", "Fuseta"]
      : ["computer shop", "buy computer", "PC components", "second hand", "refurbished", "Algarve", "Fuseta"],
    alternates: {
      canonical: `${base}/loja`,
      languages: { pt: `${base}/loja`, en: `${base}/loja` },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `${base}/loja`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
