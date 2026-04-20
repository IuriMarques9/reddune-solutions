import "server-only";
import clientPromise from "./client";
import type { PortfolioItem } from "@/types/portfolio";
import { WithId, Document } from "mongodb";

const DB_NAME = "website";
const COLLECTION = "portfolio";

function mapDoc(doc: WithId<Document>): PortfolioItem | null {
  if (
    typeof doc.title?.pt !== "string" ||
    typeof doc.title?.en !== "string" ||
    typeof doc.imageUrl !== "string" ||
    typeof doc.url !== "string"
  )
    return null;

  return {
    id: doc._id.toString(),
    title: { pt: doc.title.pt, en: doc.title.en },
    imageUrl: typeof doc.imageUrl === "string" ? doc.imageUrl : "",
    url: typeof doc.url === "string" ? doc.url : "",
  };
}

export async function getAllPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const client = await clientPromise;
    const col = client.db(DB_NAME).collection(COLLECTION);
    const docs = await col
      .find({})
      .sort({ featured: -1, createdAt: -1 })
      .toArray();
    return docs.map(mapDoc).filter((p): p is PortfolioItem => p !== null);
  } catch (error) {
    console.error("getAllPortfolioItems error:", error);
    return [];
  }
}
