import "server-only";
import clientPromise from "./client";
import type { Product, ProductCategory, ProductCondition } from "@/types/product";
import { WithId, Document } from "mongodb";

const DB_NAME = "website";
const COLLECTION = "loja";

const isValidCategory = (v: unknown): v is ProductCategory =>
  typeof (v as ProductCategory | undefined)?.pt === "string" &&
  typeof (v as ProductCategory | undefined)?.en === "string";

const isValidCondition = (v: unknown): v is ProductCondition =>
  typeof (v as ProductCondition | undefined)?.pt === "string" &&
  typeof (v as ProductCondition | undefined)?.en === "string";

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
    category: { pt: doc.category.pt, en: doc.category.en },
    condition: isValidCondition(doc.condition) ? { pt: doc.condition.pt, en: doc.condition.en } : { pt: "novo", en: "new" },
    price: typeof doc.price === "number" ? doc.price : 0,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls : [],
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
