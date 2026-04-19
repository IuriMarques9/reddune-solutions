export const PRODUCT_CATEGORIES = ["pc", "componente", "acessorio", "outro"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CONDITIONS = ["novo", "segunda-mao", "recondicionado"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export type LocalizedText = {
  pt: string;
  en: string;
};

export type Product = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: ProductCategory;
  condition: ProductCondition;
  price: number;
  imageUrl: string;
  available: boolean;
  featured: boolean;
  createdAt: string;
};
