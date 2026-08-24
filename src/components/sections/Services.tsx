import Link from "next/link";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/Reveal";
import { ServiceCard } from "@/components/sections/ServiceCard";
import { cn } from "@/lib/utils";

/**
 * Services — Phase 4 Oasis services preview.
 *
 * Direct port of `#servicos-preview` from
 * `design-handoff/project/site/index.html` (lines 60-108).
 *
 * Structure:
 *   • Eyebrow pill (ember tint) + h2 title (with em Newsreader accent) + lead
 *   • 3 <ServiceCard> (partilhados com o hub /servicos — ver ServiceCard.tsx)
 *   • svc-note rail below: ink slab with cream CTA chip
 *
 * Cards use <Reveal> for staggered entrance via IntersectionObserver.
 */

type ServiceKey = "tecAssist" | "webDigital" | "dataRecovery";

type ServiceConfig = {
  key: ServiceKey;
  href: string;
  imageSrc: string;
  /** Filtro da página /portfolio (slug da categoria = slug do serviço). */
  portfolioHref: string;
};

const SERVICES: ReadonlyArray<ServiceConfig> = [
  {
    key: "webDigital",
    href: "/servicos/web-digital",
    imageSrc: "/web-digital.jpg",
    portfolioHref: "/portfolio?categoria=web-digital",
  },
  {
    key: "tecAssist",
    href: "/servicos/assistencia-tecnica",
    imageSrc: "/assistencia-tecnica.jpg",
    portfolioHref: "/portfolio?categoria=assistencia-tecnica",
  },
  {
    key: "dataRecovery",
    href: "/servicos/software-recuperacao",
    imageSrc: "/software-recuperacao.jpg",
    portfolioHref: "/portfolio?categoria=software-recuperacao",
  },
] as const;

export function Services() {
  const t = useTranslations("HomePage.ServicesSection");

  return (
    <section
      id="servicos-preview"
      className="relative mx-auto block w-full max-w-content px-8 py-[120px]"
    >
      <Reveal>
        <span
          className={cn(
            "inline-flex items-center gap-[10px]",
            "rounded-btn border border-ember/20 bg-ember/[0.08]",
            "px-[14px] py-[6px] mb-7",
            "font-mono text-[11px] uppercase tracking-[0.2em] text-ember",
          )}
        >
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-sm bg-ember"
          />
          {t.has("eyebrow") ? t("eyebrow") : "Os nossos serviços"}
        </span>
      </Reveal>
      <Reveal>
        <h2
          className={cn(
            "section-title font-display font-bold text-ink",
            "max-w-[1000px] mb-6",
            "text-[clamp(42px,5.5vw,88px)] leading-none tracking-[-0.035em]",
            "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-ember",
          )}
          style={{ fontVariationSettings: '"opsz" 88' }}
        >
          {t.rich("title", {
            accent: (chunks) => <em>{chunks}</em>,
          })}
        </h2>
      </Reveal>
      <Reveal>
        <p
          className={cn(
            "max-w-[640px] mb-[60px]",
            "text-[19px] leading-[1.55] text-ink-soft",
          )}
        >
          {t("description")}
        </p>
      </Reveal>

      <div
        className={cn(
          "services-grid grid gap-5",
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {SERVICES.map((svc) => (
          <Reveal key={svc.key}>
            <ServiceCard
              href={svc.href}
              portfolioHref={svc.portfolioHref}
              imageSrc={svc.imageSrc}
              imageAlt={t(`services.${svc.key}.imageAlt`)}
              title={t.rich(`services.${svc.key}.title`, {
                accent: (chunks) => <em>{chunks}</em>,
              })}
              description={t(`services.${svc.key}.description`)}
              exampleLabel={t("exampleCta")}
            />
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div
          className={cn(
            "svc-note mt-7 grid items-center gap-6",
            "grid-cols-1 md:grid-cols-[1fr_auto]",
            "rounded-card bg-ink text-cream",
            "px-8 py-7",
          )}
        >
          <p
            className={cn(
              "max-w-[700px] text-[17px] leading-[1.5]",
              "[&_em]:font-serif [&_em]:italic [&_em]:font-medium [&_em]:text-apricot",
            )}
          >
            {t.rich("quote", {
              accent: (chunks) => <em>{chunks}</em>,
              contactLink: (chunks) => (
                <Link
                  href="/contacto"
                  className="font-semibold text-cream underline underline-offset-4 decoration-apricot/60 hover:decoration-apricot"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <Link
            href="/servicos"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap",
              "rounded-btn bg-cream text-ink",
              "px-[22px] py-[14px] text-[14px] font-semibold",
              "transition-colors duration-300",
              "hover:bg-apricot",
            )}
          >
            {t("cta")}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
