"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ProductCategory } from "@/types/product";

export type CategoryValue = ProductCategory | "all";

type Props = {
  active: CategoryValue;
  onChange: (value: CategoryValue) => void;
  availableCategories?: ProductCategory[];
};

export function CategoryFilter({
  active,
  onChange,
  availableCategories = [],
}: Props) {
  const t = useTranslations("ShopPage.categories");

  const options: CategoryValue[] = [
    "all",
    ...availableCategories,
  ];

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
          {t(option)}
        </Button>
      ))}
    </div>
  );
}
