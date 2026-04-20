"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
  locale: "pt" | "en";
};


export function ProductCard({ product, locale }: Props) {
  const t = useTranslations("ShopPage");
  const [currentIndex, setCurrentIndex] = useState(0);
  const name = product.name[locale];
  const description = product.description[locale];
  const formattedDescription = description
    .replace(/\.\s+/g, ".\n")
    .trim();
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
    <Card className="shadow-lg rounded-lg overflow-hidden bg-background flex flex-col h-full transition-shadow hover:shadow-2xl">
      <div className="relative aspect-[4/3] bg-secondary/50">
        {images.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-12 w-12" aria-hidden="true" />
          </div>
        ) : (
          <Image
            src={images[currentIndex]}
            alt={`${name} ${currentIndex + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        )}

        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); setCurrentIndex(i); }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === currentIndex ? "bg-white" : "bg-white/50"
                  )}
                  aria-label={`Imagem ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {product.featured && (
          <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs font-semibold px-2 py-1 rounded">
            {t("featuredBadge")}
          </span>
        )}

      </div>

      <CardContent className="p-6 flex flex-col flex-grow gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {/* {t(`categories.${product.category}`)} */}
        </span>
        <h3 className="font-headline text-xl font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground flex-grow whitespace-pre-line">
          {formattedDescription}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="font-headline text-2xl font-bold text-primary">
            {priceLabel}
          </p>
          <span className="text-xs font-semibold px-2 py-1 rounded whitespace-nowrap bg-gray-100 text-gray-700">
            {product.condition[locale]}
          </span>
        </div>
        <Button asChild className="w-full group mt-2">
          <Link href="/contacto?subject=loja&from=shop">
            {t("contactButton")}
            <ArrowRight
              className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
