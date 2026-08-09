import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { ClosingCTA } from "@/components/sections/ClosingCTA";
import { getLocale, getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { PHONE, EMAIL } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isPt = locale !== "en";
  const t = await getTranslations("PrivacyPolicyPage");

  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
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
    path: "/politica-privacidade",
    locale,
  });
}

// Splits "Política de Privacidade" / "Privacy Policy" into
// "<prefix> <em>last-word</em>" so the title fits the Oasis pattern.
function renderPrivacyTitle(raw: string): React.ReactNode {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2) return <em>{raw}</em>;
  const last = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join(" ");
  return (
    <>
      <span>{prefix} </span>
      <em>{last}</em>
    </>
  );
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("PrivacyPolicyPage");
  const tBc = await getTranslations("Breadcrumb");

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

  const sections: Array<{
    n: string;
    title: string;
    body: React.ReactNode;
  }> = [
    {
      n: "01",
      title: t("section1Title"),
      body: (
        <dl className="space-y-3">
          {[
            { dt: t("section1Company"), dd: t("section1CompanyValue") },
            { dt: t("section1Office"), dd: t("section1OfficeValue") },
            { dt: t("section1Contact"), dd: t("section1ContactValue", { email: EMAIL, phone: PHONE }) },
          ].map((row) => (
            <div key={row.dt} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="font-semibold text-ink min-w-[220px]">{row.dt}</dt>
              <dd>{row.dd}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      n: "02",
      title: t("section2Title"),
      body: (
        <div className="space-y-4">
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
      n: "03",
      title: t("section3Title"),
      body: (
        <div className="space-y-4">
          <p>{t("section3Intro")}</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-ember">
            {section3Items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{t("section3Outro")}</p>
        </div>
      ),
    },
    {
      n: "04",
      title: t("section4Title"),
      body: <p>{t("section4P1")}</p>,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main id="main" className="flex-grow">
        <PageHero
          breadcrumb={[
            { label: tBc("home"), href: "/" },
            { label: tBc("privacyPolicy"), href: "/politica-privacidade" },
          ]}
          title={renderPrivacyTitle(t("title"))}
          description={t("subtitle")}
        />

        <section className="relative mx-auto w-full max-w-content px-8 py-16 md:py-24">
          <div className="mx-auto max-w-prose font-body text-[16px] leading-[1.7] text-ink-soft">
            {sections.map((sec) => (
              <Reveal key={sec.n}>
                <article className="mb-12">
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-ember">
                      {sec.n}
                    </span>
                    <h2 className="font-display text-[24px] md:text-[28px] font-bold tracking-[-0.01em] text-ink m-0">
                      {sec.title}
                    </h2>
                  </div>
                  <div>{sec.body}</div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <ClosingCTA
          title={t("closingTitle")}
          body={t("closingBody")}
          ctaLabel={t("ctaContact")}
          ctaHref="/contacto"
        />
      </main>
      <Footer />
    </div>
  );
}
