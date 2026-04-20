"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ProductCategory } from "@/types/product";

export type CategoryValue = string | "all";

const getCategoryKey = (category: ProductCategory) => `${category.pt}:::${category.en}`;

type Props = {
  active: CategoryValue;
  onChange: (value: CategoryValue) => void;
  locale: "pt" | "en";
  availableCategories?: ProductCategory[];
};

export function CategoryFilter({
  active,
  onChange,
  locale,
  availableCategories = [],
}: Props) {
  const t = useTranslations("ShopPage.categories");

  const options: CategoryValue[] = ["all", ...availableCategories.map(getCategoryKey)];
  const categoriesByKey = new Map(availableCategories.map((cat) => [getCategoryKey(cat), cat]));

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="flex flex-wrap justify-center gap-2"
    >
      {options.map((option) => (
        <Button
          key={option}
          variant={active === option ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option)}
          aria-pressed={active === option}
          className={cn(
            "rounded-full",
            active === option ? "" : "hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {option === "all" ? t("all") : categoriesByKey.get(option)?.[locale] ?? option}
        </Button>
      ))}
    </div>
  );
}
