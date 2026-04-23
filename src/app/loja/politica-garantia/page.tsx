import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Sparkles, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import type { PageBreadcrumbCrumb } from "@/components/ui/page-breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = publicEnv.baseUrl;
  const isPt = locale !== "en";
  const t = await getTranslations("WarrantyPolicyPage");

  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    title,
    description,
    keywords: isPt
      ? [
          "política de garantia",
          "garantia RedDune Solutions",
          "garantia equipamentos novos",
          "garantia recondicionados",
          "loja Algarve",
          "Fuseta",
        ]
      : [
          "warranty policy",
          "RedDune Solutions warranty",
          "new equipment warranty",
          "refurbished warranty",
          "shop Algarve",
          "Fuseta",
        ],
    alternates: {
      canonical: `${base}/loja/politica-garantia`,
      languages: {
        pt: `${base}/loja/politica-garantia`,
        en: `${base}/loja/politica-garantia`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `${base}/loja/politica-garantia`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WarrantyPolicyPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const from = typeof params.from === "string" ? params.from : undefined;
  const t = await getTranslations("WarrantyPolicyPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const tNavigation = await getTranslations("Navigation");

  const firstCrumbMap: Record<string, PageBreadcrumbCrumb> = {
    home: { label: tBreadcrumb("home"), href: "/" },
    shop: { label: tNavigation("shop"), href: "/loja" },
    pricing: { label: tNavigation("services"), href: "/servicos" },
    contact: { label: tBreadcrumb("contact"), href: "/contacto" },
  };
  const firstCrumb = firstCrumbMap[from ?? "home"] ?? firstCrumbMap.home;
  const crumbs: PageBreadcrumbCrumb[] = [
    firstCrumb,
    { label: tBreadcrumb("warrantyPolicy") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-20">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6">
          <PageBreadcrumb crumbs={crumbs} />
        </div>

        <section className="py-10 md:py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary text-primary-foreground mb-6 shadow-md">
                <Lock className="h-8 w-8 md:h-10 md:w-10" aria-hidden="true" />
              </div>
              <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <Card className="relative overflow-hidden border-primary/10 bg-card transition-all hover:shadow-lg hover:border-primary/30">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" aria-hidden="true" />
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
                    <Sparkles className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {t("newLabel")}
                  </p>
                  <p className="font-headline text-4xl md:text-5xl font-bold text-primary mb-1">
                    {t("newDuration")}
                  </p>
                  <p className="text-base text-muted-foreground">
                    {t("newCaption")}
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-primary/10 bg-card transition-all hover:shadow-lg hover:border-primary/30">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" aria-hidden="true" />
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
                    <RefreshCw className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {t("refurbishedLabel")}
                  </p>
                  <p className="font-headline text-4xl md:text-5xl font-bold text-primary mb-1">
                    {t("refurbishedDuration")}
                  </p>
                  <p className="text-base text-muted-foreground">
                    {t("refurbishedCaption")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="pb-16 md:pb-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-secondary/60 border border-border p-8 md:p-12 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-6">
                <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-bold mb-4">
                {t("closingTitle")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mb-8">
                {t("closingBody")}
              </p>
              <Link
                href="/contacto?from=shop"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
              >
                {t("ctaContact")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
