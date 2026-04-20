import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Contact } from "@/components/sections/Contact";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { getLocale, getTranslations } from "next-intl/server";
import type { PageBreadcrumbCrumb } from "@/components/ui/page-breadcrumb";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = publicEnv.baseUrl;
  const isPt = locale !== "en";

  const title = isPt
    ? "Contacto — RedDune Solutions | Orçamentos e Suporte Técnico"
    : "Contact — RedDune Solutions | Quotes and Technical Support";
  const description = isPt
    ? "Entre em contacto com a RedDune Solutions para orçamentos, suporte técnico ou dúvidas sobre produtos. Respondemos rapidamente."
    : "Contact RedDune Solutions for quotes, technical support or product enquiries. We respond quickly.";

  return {
    title,
    description,
    keywords: isPt
      ? ["contacto RedDune Solutions", "suporte técnico", "orçamento informático", "Fuseta", "Algarve"]
      : ["contact RedDune Solutions", "technical support", "IT quote", "Fuseta", "Algarve"],
    alternates: {
      canonical: `${base}/contacto`,
      languages: { pt: `${base}/contacto`, en: `${base}/contacto` },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `${base}/contacto`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

type ContactPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = (await searchParams) ?? {};
  const from = typeof params.from === "string" ? params.from : undefined;
  const t = await getTranslations("Breadcrumb");
  const tNavigation = await getTranslations("Navigation");

  const originCrumbMap: Record<string, PageBreadcrumbCrumb> = {
    shop: { label: tNavigation("shop"), href: "/loja" },
    pricing: { label: tNavigation("services"), href: "/servicos" },
    home: { label: t("home"), href: "/" },
  };

  const firstCrumb = originCrumbMap[from ?? "home"] ?? originCrumbMap.home;
  const crumbs: PageBreadcrumbCrumb[] = [firstCrumb, { label: t("contact") }];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <PageBreadcrumb crumbs={crumbs} />
        </div>
        <Suspense fallback={null}>
          <Contact />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
