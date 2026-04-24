import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  UserCog,
  FileCheck2,
  ListChecks,
  Clock,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import type { PageBreadcrumbCrumb } from "@/components/ui/page-breadcrumb";
import { Card } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = publicEnv.baseUrl;
  const isPt = locale !== "en";
  const t = await getTranslations("PrivacyPolicyPage");

  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    title,
    description,
    keywords: isPt
      ? [
          "política de privacidade",
          "RGPD",
          "proteção de dados",
          "Reddune Solutions",
          "dados pessoais",
          "Fuseta",
        ]
      : [
          "privacy policy",
          "GDPR",
          "data protection",
          "Reddune Solutions",
          "personal data",
          "Fuseta",
        ],
    alternates: {
      canonical: `${base}/politica-privacidade`,
      languages: {
        pt: `${base}/politica-privacidade`,
        en: `${base}/politica-privacidade`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: `${base}/politica-privacidade`,
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

export default async function PrivacyPolicyPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const from = typeof params.from === "string" ? params.from : undefined;
  const t = await getTranslations("PrivacyPolicyPage");
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
    { label: tBreadcrumb("privacyPolicy") },
  ];

  const section3Items = [
    t("section3Item1"),
    t("section3Item2"),
    t("section3Item3"),
    t("section3Item4"),
    t("section3Item5"),
    t("section3Item6"),
    t("section3Item7"),
    t("section3Item8"),
  ];

  const sections = [
    {
      icon: UserCog,
      title: t("section1Title"),
      body: (
        <dl className="space-y-3 text-base md:text-lg text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-semibold text-foreground">{t("section1Company")}</dt>
            <dd>{t("section1CompanyValue")}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-semibold text-foreground">{t("section1Office")}</dt>
            <dd>{t("section1OfficeValue")}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-semibold text-foreground">{t("section1Contact")}</dt>
            <dd>{t("section1ContactValue")}</dd>
          </div>
        </dl>
      ),
    },
    {
      icon: FileCheck2,
      title: t("section2Title"),
      body: (
        <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
          <p>{t("section2P1")}</p>
          <p>{t("section2P2")}</p>
          <p>{t("section2P3")}</p>
          <p>{t("section2P4")}</p>
          <p>{t("section2P5")}</p>
          <p>{t("section2P6")}</p>
        </div>
      ),
    },
    {
      icon: ListChecks,
      title: t("section3Title"),
      body: (
        <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
          <p>{t("section3Intro")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {section3Items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{t("section3Outro")}</p>
        </div>
      ),
    },
    {
      icon: Clock,
      title: t("section4Title"),
      body: (
        <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
          <p>{t("section4P1")}</p>
        </div>
      ),
    },
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
                <ShieldCheck className="h-8 w-8 md:h-10 md:w-10" aria-hidden="true" />
              </div>
              <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("subtitle")}
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              {sections.map(({ icon: Icon, title, body }) => (
                <Card
                  key={title}
                  className="relative overflow-hidden border-primary/10 bg-card transition-all hover:shadow-lg hover:border-primary/30"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary" aria-hidden="true" />
                  <details className="group">
                    <summary className="flex items-center gap-4 p-8 md:p-10 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 shrink-0">
                        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                      </div>
                      <h2 className="font-headline text-xl md:text-2xl font-bold flex-1 min-w-0">
                        {title}
                      </h2>
                      <ChevronDown
                        className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="px-8 md:px-10 pb-8 md:pb-10 -mt-2">
                      {body}
                    </div>
                  </details>
                </Card>
              ))}
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
                href="/contacto?from=home"
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
