"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShopFilters, type CategoryValue, type ConditionValue } from "./ShopFilters";
import { ProductCard } from "./ProductCard";
import type { Product, ProductCategory, ProductCondition } from "@/types/product";

type Props = {
  products: Product[];
};

export function ProductGrid({ products }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryValue>("all");
  const [condition, setCondition] = useState<ConditionValue>("all");
  const t = useTranslations("ShopPage");
  const locale = useLocale() === "en" ? "en" : "pt";

  const availableCategories = useMemo(() => {
    const cats = new Set<ProductCategory>();
    products.forEach((p) => cats.add(p.category));
    return Array.from(cats);
  }, [products]);

  const availableConditions = useMemo(() => {
    const conds = new Set<ProductCondition>();
    products.forEach((p) => conds.add(p.condition));
    return Array.from(conds);
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }
    if (condition !== "all") {
      result = result.filter((p) => p.condition === condition);
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
