import "server-only";
import clientPromise from "./client";
import type { Product, ProductCategory, ProductCondition } from "@/types/product";
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS } from "@/types/product";
import { WithId, Document } from "mongodb";

const DB_NAME = "loja";
const COLLECTION = "produtos";

const isValidCategory = (v: unknown): v is ProductCategory =>
  typeof v === "string" && PRODUCT_CATEGORIES.includes(v as ProductCategory);

const isValidCondition = (v: unknown): v is ProductCondition =>
  typeof v === "string" && PRODUCT_CONDITIONS.includes(v as ProductCondition);

function mapDoc(doc: WithId<Document>): Product | null {
  if (
    typeof doc.name?.pt !== "string" ||
    typeof doc.name?.en !== "string" ||
    typeof doc.description?.pt !== "string" ||
    typeof doc.description?.en !== "string" ||
    !isValidCategory(doc.category)
  )
    return null;

  return {
    id: doc._id.toString(),
    name: { pt: doc.name.pt, en: doc.name.en },
    description: { pt: doc.description.pt, en: doc.description.en },
    category: doc.category,
    condition: isValidCondition(doc.condition) ? doc.condition : "novo",
    price: typeof doc.price === "number" ? doc.price : 0,
    imageUrl: typeof doc.imageUrl === "string" ? doc.imageUrl : "",
    available: doc.available === true,
    featured: doc.featured === true,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(0).toISOString(),
  };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection(COLLECTION);
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const col = await getCollection();
    const docs = await col
      .find({ available: true })
      .sort({ featured: -1, createdAt: -1 })
      .toArray();
    return docs.map(mapDoc).filter((p): p is Product => p !== null);
  } catch (error) {
    console.error("getAllProducts error:", error);
    return [];
  }
}

export async function getProductsByCategory(
  category: ProductCategory
): Promise<Product[]> {
  try {
    const col = await getCollection();
    const docs = await col
      .find({ available: true, category })
      .sort({ featured: -1, createdAt: -1 })
      .toArray();
    return docs.map(mapDoc).filter((p): p is Product => p !== null);
  } catch (error) {
    console.error("getProductsByCategory error:", error);
    return [];
  }
}
