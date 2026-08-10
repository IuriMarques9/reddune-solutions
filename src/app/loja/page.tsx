import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { ProductGrid } from "@/components/sections/shop/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";
import { getAllProducts } from "@/lib/mongodb/products";
import { publicEnv } from "@/lib/env";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { itemListLd, jsonLdScript } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isPt = locale !== "en";

  return buildMetadata({
    title: isPt
      ? "Loja de Informática em Fuseta, Algarve | RedDune"
      : "Computer Shop in Fuseta, Algarve | RedDune Solutions",
    description: isPt
      ? "Computadores novos e recondicionados, componentes e acessórios com garantia. Preços justos e aconselhamento honesto em Fuseta, Algarve."
      : "New and refurbished computers, PC components and accessories, all with warranty. Fair prices and honest advice at our shop in Fuseta, Algarve.",
    keywords: isPt
      ? ["loja informática", "comprar computador", "componentes PC", "recondicionado", "Algarve", "Fuseta"]
      : ["computer shop", "buy computer", "PC components", "refurbished", "Algarve", "Fuseta"],
    path: "/loja",
    locale,
  });
}

function ShopHeroSection() {
  const t = useTranslations("ShopPage.hero");
  const tBc = useTranslations("Breadcrumb");
  const tNav = useTranslations("Navigation");
  return (
    <PageHero
      breadcrumb={[
        { label: tBc("home"), href: "/" },
        { label: tNav("shop"), href: "/loja" },
      ]}
      title={t.rich("title", {
        accent: (chunks) => <em>{chunks}</em>,
      })}
      description={t("description")}
    />
  );
}

function WarrantyStrip() {
  const t = useTranslations("ShopPage.warranty");
  return (
    <section className="relative mx-auto w-full max-w-content px-8 py-16 md:py-24">
      <Reveal>
        <span
          className={cn(
            "inline-flex items-center gap-[10px]",
            "rounded-btn border border-ember/20 bg-ember/[0.08]",
            "px-[14px] py-[6px] mb-7",
            "font-mono text-[11px] uppercase tracking-[0.2em] text-ember",
          )}
        >
          <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-sm bg-ember" />
          {t("eyebrow")}
        </span>
      </Reveal>
      <Reveal>
        <h2
          className={cn(
            "font-display font-bold text-ink max-w-[1000px] mb-10",
            "text-[clamp(32px,4.8vw,68px)] leading-[1.05] tracking-[-0.03em]",
            "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
          )}
        >
          {t.rich("title", {
            accent: (chunks) => <em>{chunks}</em>,
          })}
        </h2>
      </Reveal>

      <Reveal>
        <div
          className={cn(
            "relative grid gap-8 overflow-hidden",
            "grid-cols-1 md:grid-cols-3",
            "rounded-card bg-ink text-cream",
            "px-10 py-[60px]",
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-36 z-0 h-[500px] w-[500px] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, var(--ember), transparent 60%)",
              animation: "glow 5s ease-in-out infinite",
            }}
          />
          {[
            { v: "3", unit: t("statNew.unit"), label: t("statNew.label"), sub: t("statNew.sub") },
            { v: "18", unit: t("statRefurb.unit"), label: t("statRefurb.label"), sub: t("statRefurb.sub") },
            { v: "14", unit: t("statReturn.unit"), label: t("statReturn.label"), sub: t("statReturn.sub") },
          ].map((cell, i) => (
            <div key={`${cell.label}-${i}`} className="relative z-[1] text-center md:text-left">
              <div
                className={cn(
                  "font-display font-bold tracking-[-0.03em]",
                  "text-[clamp(48px,5.5vw,80px)] leading-[0.95]",
                  "bg-clip-text text-transparent",
                )}
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--cream) 0%, var(--apricot) 70%, var(--ember) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {cell.v}
                <small className="ml-1 text-[0.4em] font-mono text-apricot align-baseline">
                  {cell.unit}
                </small>
              </div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-apricot">
                {cell.label}
              </div>
              <div className="mt-2 text-sm text-cream-deep">{cell.sub}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div
          className={cn(
            "mt-8 grid items-center gap-6",
            "grid-cols-1 md:grid-cols-[1fr_auto]",
            "rounded-card bg-sand-warm/70",
            "px-8 py-6",
          )}
        >
          <p
            className={cn(
              "text-[15px] md:text-[16px] leading-[1.55] text-ink-soft",
              "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
            )}
          >
            {t.rich("policiesNote", {
              em: (chunks) => <em>{chunks}</em>,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/loja/politica-garantia"
              className={cn(
                "inline-flex items-center gap-2 rounded-btn",
                "bg-ink text-cream px-5 py-3",
                "font-mono text-[12px] uppercase tracking-[0.12em]",
                "transition-colors duration-300 hover:bg-ember",
              )}
            >
              {t("policyWarrantyCta")}
              <ArrowRight
                className="size-[14px] shrink-0"
                strokeWidth={2.25}
                aria-hidden
              />
            </Link>
            <Link
              href="/loja/politica-devolucao"
              className={cn(
                "inline-flex items-center gap-2 rounded-btn",
                "border border-dune-deep/15 bg-white/60 px-5 py-3",
                "font-mono text-[12px] uppercase tracking-[0.12em] text-ink",
                "transition-colors duration-300 hover:border-ember hover:text-ember",
              )}
            >
              {t("policyReturnCta")}
              <ArrowRight
                className="size-[14px] shrink-0"
                strokeWidth={2.25}
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default async function ShopPage() {
  const products = await getAllProducts();
  const locale = await getLocale();
  const isPt = locale !== "en";
  const tShop = await getTranslations("ShopPage");

  const catalogSchema = itemListLd({
    url: `${publicEnv.baseUrl}/loja`,
    name: isPt
      ? "Catálogo Reddune Solutions"
      : "Reddune Solutions Catalog",
    items: products.map((p) => ({
      id: p.id,
      name: isPt ? p.name.pt : p.name.en,
      price: p.price,
      image: p.imageUrls[0],
      description: isPt ? p.description.pt : p.description.en,
    })),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(catalogSchema) }}
        />
      )}
      <main id="main" className="flex-grow">
        <ShopHeroSection />
        <section className="pb-16">
          {/* h2 sr-only: os títulos dos produtos são h3 e vinham antes de
              qualquer h2 (salto h1→h3 na hierarquia). */}
          <h2 className="sr-only">{isPt ? "Catálogo" : "Catalogue"}</h2>
          <ProductGrid products={products} />
          {products.length > 0 && (
            <p className="mx-auto w-full max-w-content px-8 mt-6 font-mono text-[11px] tracking-[0.08em] text-ink-mute">
              {tShop("vatNote")}
            </p>
          )}
        </section>
        <WarrantyStrip />
      </main>
      <Footer />
    </div>
  );
}
