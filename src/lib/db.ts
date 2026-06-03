import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client);

export async function executeRawSQL(sql: string, params: any[] = []) {
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

process.on("SIGTERM", async () => {
  await client.end({ timeout: 30 });
  process.exit(0);
});

export default db;