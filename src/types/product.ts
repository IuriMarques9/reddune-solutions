

export type LocalizedText = {
  pt: string;
  en: string;
};

export type ProductCondition = LocalizedText;
export type ProductCategory = LocalizedText;

export type Product = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: ProductCategory;
  condition: ProductCondition;
  price: number;
  imageUrls: string[];
  available: boolean;
  featured: boolean;
  createdAt: string;
};
