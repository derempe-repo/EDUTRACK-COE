import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
  verbose: true,
});
