"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { PortfolioItem } from "@/types/portfolio";
import Link from "next/link";

type Props = {
  items: PortfolioItem[];
};

function PortfolioCard({ item, locale }: { item: PortfolioItem; locale: "pt" | "en" }) {
  const image = item.imageUrl;

  return (
    <Card className="overflow-hidden group transition-shadow duration-300 hover:shadow-2xl rounded-lg">
      <Link href={item.url} target="_blank" aria-label={item.title[locale]}>
        <CardContent className="p-0 relative aspect-[3/2]">
          {image === "" ? (
            <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
              <ImageOff className="h-12 w-12" aria-hidden="true" />
            </div>
          ) : (
            <Image
              src={image}
              alt={item.title[locale]}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}

          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />

          <div className="absolute bottom-0 left-0 p-6">
            <h3 className="font-headline text-xl font-bold text-white">{item.title[locale]}</h3>
          </div>

          <div
            className="absolute top-4 right-4 bg-accent text-accent-foreground p-2 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-300 ease-in-out"
            aria-hidden="true"
          >
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export function Portfolio({ items }: Props) {
  const t = useTranslations("HomePage.PortfolioSection");
  const rawLocale = useLocale();
  const locale = rawLocale === "en" ? "en" : "pt";

  return (
    <section id="portfolio" className="py-12 md:py-24 bg-secondary/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t("title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("emptyState")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <PortfolioCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
