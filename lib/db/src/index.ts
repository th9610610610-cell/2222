import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const DATABASE_URL = (process.env.DATABASE_URL || "").trim();

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("supabase") || DATABASE_URL.includes("neon") || DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
