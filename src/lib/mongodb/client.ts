import "server-only";
import { MongoClient } from "mongodb";

let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI environment variable not set");
  }
  return uri;
}

function createClient() {
  const uri = getMongoUri();
  const client = new MongoClient(uri);
  return client.connect();
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClient().catch((error) => {
      // Clear cached failure so next request can retry.
      global._mongoClientPromise = undefined;
      throw error;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = createClient();
}

export default clientPromise;
