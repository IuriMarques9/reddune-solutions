"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShopFilters, type CategoryValue, type ConditionValue } from "./ShopFilters";
import { ProductCard } from "./ProductCard";
import type { Product, ProductCategory, ProductCondition } from "@/types/product";

type Props = {
  products: Product[];
};

const getCategoryKey = (v: ProductCategory) => `${v.pt}:::${v.en}`;
const getConditionKey = (v: ProductCondition) => `${v.pt}:::${v.en}`;

export function ProductGrid({ products }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryValue>("all");
  const [condition, setCondition] = useState<ConditionValue>("all");
  const t = useTranslations("ShopPage");
  const locale = useLocale() === "en" ? "en" : "pt";
  const availableCategories = useMemo(() => {
    const cats = new Map<string, ProductCategory>();
    products.forEach((p) => cats.set(getCategoryKey(p.category), p.category));
    return Array.from(cats.values());
  }, [products]);

  const availableConditions = useMemo(() => {
    const conds = new Map<string, ProductCondition>();
    products.forEach((p) => conds.set(getConditionKey(p.condition), p.condition));
    return Array.from(conds.values());
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (category !== "all") {
      result = result.filter((p) => getCategoryKey(p.category) === category);
    }
    if (condition !== "all") {
      result = result.filter((p) => getConditionKey(p.condition) === condition);
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name[locale].toLowerCase().includes(query) ||
          p.description[locale].toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, category, condition, search, locale]);

  return (
    <div className="space-y-8">
      <ShopFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        condition={condition}
        onConditionChange={setCondition}
        locale={locale}
        availableCategories={availableCategories}
        availableConditions={availableConditions}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {search.trim() || category !== "all" || condition !== "all"
            ? t("noResults")
            : t("emptyState")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
