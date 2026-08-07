import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/sections/PageHero";
import { CTAWave } from "@/components/sections/CTAWave";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";
import type { ServicoSlug } from "@/lib/servicos-content";
import { getAllServicos } from "@/lib/mongodb/servicos";
import { SERVICO_SLUG } from "@/types/servico";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isPt = locale !== "en";

  return buildMetadata({
    title: isPt
      ? "Serviços de Informática no Algarve | RedDune Solutions"
      : "IT Services & Pricing in the Algarve | RedDune Solutions",
    description: isPt
      ? "Compare os nossos serviços e preços: assistência técnica, web e digital, software e recuperação de dados. Para particulares e empresas em todo o Algarve."
      : "Compare our services and pricing: technical support, web and digital, software and data recovery. For individuals and businesses across the Algarve.",
    keywords: isPt
      ? ["serviços informáticos", "assistência técnica", "desenvolvimento web", "recuperação de dados", "Algarve", "Fuseta"]
      : ["IT services", "technical support", "web development", "data recovery", "Algarve", "Fuseta"],
    path: "/servicos",
    locale,
  });
}

type ServiceVisualConfig = {
  slug: ServicoSlug;
  imageSrc: string;
};

// Imagens reais — alinhadas com a home page (Services.tsx).
const SERVICE_VISUALS: ReadonlyArray<ServiceVisualConfig> = [
  {
    slug: "assistencia-tecnica",
    imageSrc: "/assistencia-tecnica.jpg",
  },
  {
    slug: "web-digital",
    imageSrc: "/web-digital.jpg",
  },
  {
    slug: "software-recuperacao",
    imageSrc: "/software-recuperacao.jpg",
  },
] as const;

function ServicesHubBody({ precosDb }: { precosDb: Record<string, number | null> }) {
  const t = useTranslations("ServicosPage.hub");

  return (
    <>
      {/* Intro block */}
      <section className="relative mx-auto w-full max-w-content px-8 pt-16 md:pt-24">
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
            {t("intro.eyebrow")}
          </span>
        </Reveal>
        <Reveal>
          <h2
            className={cn(
              "font-display font-bold text-ink max-w-[1000px] mb-6",
              "text-[clamp(36px,5vw,76px)] leading-none tracking-[-0.035em]",
              "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
            )}
            style={{ fontVariationSettings: '"opsz" 76' }}
          >
            {t.rich("intro.title", {
              accent: (chunks) => <em>{chunks}</em>,
            })}
          </h2>
        </Reveal>
        <Reveal>
          <p className="max-w-[640px] mb-[60px] text-[17px] md:text-[19px] leading-[1.55] text-ink-soft">
            {t("intro.lead")}
          </p>
        </Reveal>

        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {SERVICE_VISUALS.map((svc) => (
            <Reveal key={svc.slug}>
              <Link
                href={`/servicos/${svc.slug}`}
                className={cn(
                  "group flex h-full min-h-[480px] flex-col overflow-hidden",
                  "rounded-card bg-sand-warm",
                  "px-8 pt-9 pb-8 no-underline text-ink",
                  "shadow-warm transition-all duration-500 ease-oasis",
                  "hover:-translate-y-2 hover:shadow-warm-lg",
                )}
              >
                <div
                  className={cn(
                    "relative mb-7 overflow-hidden rounded-[20px] aspect-[4/3]",
                  )}
                >
                  <Image
                    src={svc.imageSrc}
                    alt={t(`cards.${svc.slug}.imageAlt`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                <h3
                  className={cn(
                    "font-display font-bold text-[26px] leading-[1.05] tracking-[-0.02em] mb-3.5",
                    "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
                  )}
                >
                  {t.rich(`cards.${svc.slug}.title`, {
                    accent: (chunks) => <em>{chunks}</em>,
                  })}
                </h3>
                <p className="flex-1 text-[15px] leading-[1.55] text-ink-soft">
                  {t(`cards.${svc.slug}.description`)}
                </p>

                <div
                  className={cn(
                    "mt-6 flex items-center justify-between pt-5",
                    "border-t border-dashed border-dune-deep/15",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft",
                      "[&_b]:font-display [&_b]:font-bold [&_b]:not-italic [&_b]:text-ember [&_b]:text-base",
                    )}
                  >
                    {precosDb[svc.slug] != null ? (
                      <>desde <b>{precosDb[svc.slug]}€</b></>
                    ) : (
                      t.rich(`cards.${svc.slug}.price`, {
                        b: (chunks) => <b>{chunks}</b>,
                      })
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex h-[38px] w-[38px] items-center justify-center",
                      "rounded-full bg-ink text-cream",
                      "transition-all duration-300 ease-oasis",
                      "group-hover:bg-ember group-hover:rotate-[-45deg]",
                    )}
                  >
                    <ArrowRight className="size-[17px]" strokeWidth={2.25} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Big mark */}
      <Reveal>
        <div
          aria-hidden="true"
          className={cn(
            "mx-auto w-full max-w-content px-8 py-12",
            "font-display font-bold text-[clamp(60px,11vw,170px)] leading-none tracking-[-0.04em] text-ink",
            "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
          )}
        >
          {t.rich("process.bigMark", {
            em: (chunks) => <em>{chunks}</em>,
          })}
        </div>
      </Reveal>

      {/* Process steps */}
      <section className="relative mx-auto w-full max-w-content px-8 pb-24">
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
            {t("process.eyebrow")}
          </span>
        </Reveal>
        <Reveal>
          <h2
            className={cn(
              "font-display font-bold text-ink max-w-[1000px] mb-10",
              "text-[clamp(32px,4.5vw,64px)] leading-[1.05] tracking-[-0.03em]",
              "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
            )}
          >
            {t.rich("process.title", {
              accent: (chunks) => <em>{chunks}</em>,
            })}
          </h2>
        </Reveal>

        <ProcessStepsRow />
      </section>
    </>
  );
}

function ProcessStepsRow() {
  const t = useTranslations("ServicosPage.hub.process");
  const stepsRaw = t.raw("steps");
  const steps = Array.isArray(stepsRaw)
    ? (stepsRaw as { n: string; label: string; sub: string }[])
    : [];

  return (
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
        {steps.map((step) => (
          <div key={step.n} className="relative z-[1] text-center md:text-left">
            <div
              className={cn(
                "font-display font-bold tracking-[-0.03em]",
                "text-[clamp(42px,5vw,68px)] leading-[0.95]",
                "bg-clip-text text-transparent",
              )}
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--cream) 0%, var(--apricot) 70%, var(--ember) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {step.n}
            </div>
            <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-apricot">
              {step.label}
            </div>
            <p className="mt-3 max-w-[300px] text-[14px] leading-[1.55] text-cream-deep">
              {step.sub}
            </p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function ServicosHero() {
  const t = useTranslations("ServicosPage.hub.hero");
  const tBc = useTranslations("Breadcrumb");
  const tNav = useTranslations("Navigation");
  return (
    <PageHero
      breadcrumb={[
        { label: tBc("home"), href: "/" },
        { label: tNav("services"), href: "/servicos" },
      ]}
      title={t.rich("title", {
        accent: (chunks) => <em>{chunks}</em>,
      })}
      description={t("lead")}
    />
  );
}

export default async function ServicosPage() {
  // Preço "desde" por slug: menor precoBase entre serviços ativos.
  // Se slug tem só variantes, usa o menor preco das variantes.
  const precosDb: Record<string, number | null> = Object.fromEntries(
    SERVICO_SLUG.map((s) => [s, null])
  );
  try {
    const servicos = await getAllServicos();
    for (const slug of SERVICO_SLUG) {
      const ativos = servicos.filter((s) => s.slug === slug && s.ativo);
      let min: number | null = null;
      for (const s of ativos) {
        const candidates: number[] = [];
        if (s.precoBase != null) candidates.push(s.precoBase);
        if (s.variantes) s.variantes.forEach((v) => candidates.push(v.preco));
        for (const c of candidates) {
          if (min == null || c < min) min = c;
        }
      }
      precosDb[slug] = min;
    }
  } catch {
    // fallback silencioso ao i18n
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main id="main" className="flex-grow">
        <ServicosHero />
        <ServicesHubBody precosDb={precosDb} />
        <CTAWave />
      </main>
      <Footer />
    </div>
  );
}
