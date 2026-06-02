import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

type DatabaseGlobal = typeof globalThis & {
  __lmsPostgresClient?: ReturnType<typeof postgres>;
  __lmsDrizzleDb?: Database;
};

function getDb() {
  const globalForDb = globalThis as DatabaseGlobal;

  if (globalForDb.__lmsDrizzleDb) {
    return globalForDb.__lmsDrizzleDb;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = postgres(connectionString, {
    idle_timeout: 20,
    max: 5,
    max_lifetime: 60 * 10,
    prepare: false,
  });
  const dbInstance = drizzle(client, { schema });

  globalForDb.__lmsPostgresClient = client;
  globalForDb.__lmsDrizzleDb = dbInstance;

  return dbInstance;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});
