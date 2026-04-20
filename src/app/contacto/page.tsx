import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Contact } from "@/components/sections/Contact";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { SiteMessages } from "@/types/i18n";
import type { PageBreadcrumbCrumb } from "@/components/ui/page-breadcrumb";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = (await getMessages()) as unknown as SiteMessages;
  const title =
    (messages.TabTitles as Record<string, string> | undefined)?.contact ??
    "RedDune Solutions - Contacto";
  const description = messages.TabDescription ?? "Entre em contacto com a RedDune Solutions.";

  return {
    title,
    description,
    alternates: { canonical: "/contacto" },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: "/contacto",
      siteName: "Reddune Solutions",
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
    pricing: { label: tNavigation("services"), href: "/pricingPage" },
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
