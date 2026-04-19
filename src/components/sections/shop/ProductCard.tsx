"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
  locale: "pt" | "en";
};

const conditionStyles: Record<string, string> = {
  novo: "bg-green-100 text-green-800",
  recondicionado: "bg-yellow-100 text-yellow-800",
  "segunda-mao": "bg-gray-100 text-gray-700",
};

export function ProductCard({ product, locale }: Props) {
  const t = useTranslations("ShopPage");
  const name = product.name[locale];
  const description = product.description[locale];
  const priceLabel =
    product.price > 0 ? `${product.price}€` : t("contactPrice");

  return (
    <Card className="shadow-lg rounded-lg overflow-hidden bg-background flex flex-col h-full transition-shadow hover:shadow-2xl">
      <div className="relative aspect-[4/3] bg-secondary/50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-12 w-12" aria-hidden="true" />
          </div>
        )}

        {product.featured && (
          <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs font-semibold px-2 py-1 rounded">
            {t("featuredBadge")}
          </span>
        )}

        <span
          className={cn(
            "absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded",
            conditionStyles[product.condition] ?? "bg-gray-100 text-gray-700"
          )}
        >
          {t(`conditions.${product.condition}`)}
        </span>
      </div>

      <CardContent className="p-6 flex flex-col flex-grow gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {t(`categories.${product.category}`)}
        </span>
        <h3 className="font-headline text-xl font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground flex-grow">{description}</p>
        <p className="font-headline text-2xl font-bold text-primary">
          {priceLabel}
        </p>
        <Button asChild className="w-full group mt-2">
          <Link href="/contacto?subject=loja">
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
