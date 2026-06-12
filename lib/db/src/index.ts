import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const url = process.env.DATABASE_URL || "postgresql://localhost/lotto-win-placeholder";

export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });

export * from "./schema";
