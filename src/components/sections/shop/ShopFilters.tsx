"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import type { ProductCategory, ProductCondition } from "@/types/product";

export type CategoryValue = string | "all";
export type ConditionValue = string | "all";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  category: CategoryValue;
  onCategoryChange: (v: CategoryValue) => void;
  condition: ConditionValue;
  onConditionChange: (v: ConditionValue) => void;
  locale: "pt" | "en";
  availableCategories: ProductCategory[];
  availableConditions: ProductCondition[];
};

const selectClass =
  "border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const getCategoryKey = (category: ProductCategory) => `${category.pt}:::${category.en}`;
const getConditionKey = (condition: ProductCondition) => `${condition.pt}:::${condition.en}`;

export function ShopFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  condition,
  onConditionChange,
  locale,
  availableCategories,
  availableConditions,
}: Props) {
  const t = useTranslations("ShopPage");

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-grow">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          aria-label={t("searchPlaceholder")}
        />
      </div>

      {availableCategories.length > 0 && (
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as CategoryValue)}
          className={selectClass}
          aria-label={t("filters.categoryLabel")}
        >
          <option value="all">{t("filters.allCategories")}</option>
          {availableCategories.map((cat) => (
            <option key={getCategoryKey(cat)} value={getCategoryKey(cat)}>
              {cat[locale]}
            </option>
          ))}
        </select>
      )}

      {availableConditions.length > 0 && (
        <select
          value={condition}
          onChange={(e) => onConditionChange(e.target.value as ConditionValue)}
          className={selectClass}
          aria-label={t("filters.conditionLabel")}
        >
          <option value="all">{t("filters.allConditions")}</option>
          {availableConditions.map((cond) => (
            <option key={getConditionKey(cond)} value={getConditionKey(cond)}>
              {cond[locale]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
