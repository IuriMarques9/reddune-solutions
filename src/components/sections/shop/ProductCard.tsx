"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ImageOff, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { conditionMeta, type Product } from "@/types/product";

type Props = {
  product: Product;
  locale: "pt" | "en";
};

/**
 * ProductCard — Phase 5c Oasis shop card.
 *
 * Visual port of the design-handoff loja card style (sand-warm background,
 * rounded-card, hover lift). Keeps multi-image carousel from previous
 * implementation. CTA goes to /contacto?subject=loja.
 */
export function ProductCard({ product, locale }: Props) {
  const t = useTranslations("ShopPage");
  const a11y = useTranslations("A11y");
  const [currentIndex, setCurrentIndex] = useState(0);
  const name = product.name[locale];
  const description = product.description[locale];
  const priceLabel =
    product.price > 0 ? `${product.price}€` : t("contactPrice");
  const images = product.imageUrls;
  const hasMultiple = images.length > 1;

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden",
        "rounded-card bg-sand-warm",
        "shadow-warm transition-all duration-500 ease-oasis",
        "hover:-translate-y-1.5 hover:shadow-warm-lg",
      )}
    >
      {/* Image area */}
      <div
        className={cn(
          "relative w-full overflow-hidden",
          "aspect-[4/3]",
        )}
        style={{
          background:
            "linear-gradient(135deg, var(--cream-deep), var(--peach))",
        }}
      >
        {images.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-ink-mute">
            <ImageOff className="h-12 w-12" aria-hidden="true" />
          </div>
        ) : (
          <Image
            src={images[currentIndex]}
            alt={
              images.length > 1
                ? a11y("productImageAlt", {
                    name,
                    n: currentIndex + 1,
                    total: images.length,
                  })
                : name
            }
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-4"
          />
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={a11y("prevImage")}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-10",
                "inline-flex h-8 w-8 items-center justify-center",
                "rounded-full bg-ink/60 text-cream backdrop-blur",
                "transition-colors hover:bg-ink/80",
              )}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={a11y("nextImage")}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-10",
                "inline-flex h-8 w-8 items-center justify-center",
                "rounded-full bg-ink/60 text-cream backdrop-blur",
                "transition-colors hover:bg-ink/80",
              )}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentIndex(i);
                  }}
                  aria-label={a11y("imageIndex", { index: i + 1 })}
                  className={cn(
                    "h-1.5 w-4 rounded-full transition-colors",
                    i === currentIndex ? "bg-ink" : "bg-ink/30",
                  )}
                />
              ))}
            </div>
          </>
        )}

        {product.featured && (
          <span
            className={cn(
              "absolute left-3 top-3 z-10",
              "rounded-btn bg-ember text-cream",
              "px-2.5 py-1",
              "font-mono text-[10px] uppercase tracking-[0.15em] font-semibold",
            )}
          >
            {t("featuredBadge")}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-3 px-7 pt-6 pb-7">
        <div>
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.18em] text-ember",
            )}
          >
            {product.category[locale]}
          </span>
          <h3
            className={cn(
              "mt-2 font-display text-[20px] font-bold leading-[1.15] tracking-[-0.01em] text-ink",
              "line-clamp-2",
            )}
          >
            {name}
          </h3>
        </div>

        <p className="flex-grow text-[14px] leading-[1.55] text-ink-soft line-clamp-3">
          {description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4 border-t border-dashed border-dune-deep/15">
          <div>
            <div className="font-display text-[22px] font-bold leading-none text-ink">
              {priceLabel}
              {product.price > 0 && (
                <span className="ml-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
                  {t("vatSuffix")}
                </span>
              )}
            </div>
            {(() => {
              const cm = conditionMeta(product.condition.pt || product.condition[locale]);
              const label = locale === "en" ? (product.condition.en || cm.label) : cm.label;
              return (
                <div
                  className="mt-2 inline-flex rounded-btn px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] font-semibold"
                  style={{ background: cm.bg, color: cm.color }}
                >
                  {label}
                </div>
              );
            })()}
          </div>
          <Link
            href="/contacto?subject=loja"
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center",
              "rounded-full bg-ink text-cream",
              "transition-all duration-300 ease-oasis",
              "group-hover:bg-ember group-hover:rotate-[-45deg]",
            )}
            aria-label={t("contactButton")}
          >
            <ArrowRight className="size-[15px]" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
