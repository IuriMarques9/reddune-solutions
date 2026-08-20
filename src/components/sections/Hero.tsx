import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { DuneBackground } from "@/components/motion/DuneBackground";
import { Sun } from "@/components/motion/Sun";
import { Sparks } from "@/components/motion/Sparks";
import { cn } from "@/lib/utils";

/**
 * Hero — Phase 4 Oasis home hero.
 *
 * Direct port of `section.hero` from
 * `design-handoff/project/site/index.html` (lines 24-51) + the matching CSS
 * blocks in `design-handoff/project/site/styles.css`.
 *
 * Structure (Iuri `site/index.html` + eyebrow acima do título, 2026-08-20 —
 * GEO: nome + localização têm de estar no primeiro terço da página):
 *   • <DuneBackground/> + <Sun/> + <Sparks/> compose the scene
 *   • Eyebrow "RedDune Solutions · Fuseta, Algarve" (fadeUp)
 *   • 3-row title (rise animation per row, "certa" wrapped in Newsreader em)
 *   • Body subtitle (fadeUp)
 *   • CTA row: primary (ink → cream) + ghost (cream/translucent)
 *
 * Note: title markup uses next-intl t.rich() with an <accent> tag mapping to
 * <em>, matching the design's "A resposta certa." typographic accent.
 */
export function Hero() {
  const t = useTranslations("HomePage.Hero");

  return (
    <section
      id="home"
      className={cn(
        "hero relative flex min-h-screen flex-col justify-center overflow-hidden",
        "pt-20 md:pt-[180px] pb-20 px-8",
      )}
    >
      {/* Scene: dunes + sun + sparks */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden="true"
      >
        <Sun size="lg" />
        <DuneBackground />
        <Sparks />
      </div>

      <div className="relative z-[5] mx-auto w-full max-w-content text-center">
        {/* Eyebrow — entidade + localização visíveis no topo (GEO) */}
        <p
          className={cn(
            "mb-6 text-[13px] font-semibold uppercase tracking-[0.18em]",
            "text-ink-soft opacity-0",
          )}
          style={{
            animation:
              "fadeUp 0.9s 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {t("eyebrow")}
        </p>

        {/* Title — 3 rows, each animates rise from below */}
        <h1
          className={cn(
            "hero-title font-display font-bold text-ink",
            "mb-9",
            "text-[clamp(42px,7vw,110px)] leading-[0.96] tracking-[-0.04em]",
          )}
          style={{ fontVariationSettings: '"opsz" 96' }}
        >
          {t.rich("title", {
            row: (chunks) => (
              <span className="row">
                <span>{chunks}</span>
              </span>
            ),
            accent: (chunks) => <em>{chunks}</em>,
          })}
        </h1>

        {/* Subtitle */}
        <p
          className={cn(
            "mx-auto max-w-[640px] mb-11",
            "text-[19px] leading-[1.55] text-ink-soft opacity-0",
          )}
          style={{
            animation:
              "fadeUp 0.9s 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {t("description")}
        </p>

        {/* CTA row */}
        <div
          className={cn(
            "hero-cta-row flex flex-wrap items-center justify-center gap-[14px] opacity-0",
          )}
          style={{
            animation: "fadeUp 0.9s 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <Link
            href="/servicos"
            className={cn(
              "group inline-flex items-center gap-3",
              "rounded-btn bg-ink px-[30px] py-[18px]",
              "text-[15px] font-semibold text-cream",
              "shadow-[0_10px_30px_rgba(42,20,16,0.18)]",
              "transition-all duration-300 ease-oasis",
              "hover:bg-ember hover:-translate-y-[3px]",
              "hover:shadow-[0_14px_36px_rgba(214,66,42,0.36)]",
            )}
          >
            {t("cta.primary")}
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full",
                "bg-cream text-ink",
                "transition-transform duration-300 ease-oasis",
                "group-hover:rotate-[-45deg]",
              )}
            >
              <ArrowRight className="size-[15px]" strokeWidth={2.25} />
            </span>
          </Link>
          <Link
            href="/loja"
            className={cn(
              "inline-flex items-center",
              "rounded-btn border border-dune-deep/15 bg-white/50",
              "px-7 py-[18px]",
              "text-[15px] font-medium text-ink",
              "backdrop-blur transition-all duration-300",
              "hover:border-ember hover:bg-white/80 hover:text-ember",
            )}
          >
            {t("cta.secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
