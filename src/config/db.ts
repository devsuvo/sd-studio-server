import { Db, MongoClient } from "mongodb";
import { env } from "./env";
import type { BookingDoc, StudioDoc } from "../types";

// Cached across invocations so serverless functions reuse the connection.
let clientPromise: Promise<MongoClient> | null = null;
let indexesReady = false;

export async function getDb(): Promise<Db> {
  if (!env.mongoUri) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) {
    clientPromise = new MongoClient(env.mongoUri).connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  const db = (await clientPromise).db(env.dbName);
  if (!indexesReady) {
    indexesReady = true;
    await Promise.all([
      db.collection("studios").createIndex({ category: 1, hourlyRate: 1 }),
      db.collection("studios").createIndex({ hostId: 1 }),
      db.collection("bookings").createIndex({ studioId: 1, date: 1, status: 1 }),
      db.collection("bookings").createIndex({ guestId: 1 }),
      db.collection("bookings").createIndex({ hostId: 1 }),
    ]).catch(() => (indexesReady = false));
  }
  return db;
}

export async function collections() {
  const db = await getDb();
  return {
    studios: db.collection<StudioDoc>("studios"),
    bookings: db.collection<BookingDoc>("bookings"),
    users: db.collection("user"),
  };
}
