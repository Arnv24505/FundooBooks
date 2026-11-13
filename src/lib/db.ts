import mongoose from "mongoose";
import { env, requireMongoUri } from "@/lib/env";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.mongooseCache ??= {
  conn: null,
  promise: null,
});

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = requireMongoUri();

  cache.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
    dbName: process.env.MONGODB_DB_NAME || undefined,
  });

  try {
    cache.conn = await cache.promise;
    if (!env.isProduction) {
      console.info("[db] connected");
    }
  } catch (error) {
    // Do not cache a rejected promise; the next request should retry.
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
