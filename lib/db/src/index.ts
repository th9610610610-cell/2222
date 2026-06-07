import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = (process.env.DATABASE_URL || "").trim();

if (!rawUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Parse a postgres/postgresql URL safely, handling passwords that contain
 * special characters like '@', '/', '?' which would break new URL() or
 * simpler parsers. Uses the LAST '@' as the auth/host separator.
 */
function parsePgUrl(url: string): pg.PoolConfig {
  try {
    const protocolEnd = url.indexOf("://");
    if (protocolEnd === -1) throw new Error("no protocol");
    const afterProtocol = url.slice(protocolEnd + 3);
    const lastAt = afterProtocol.lastIndexOf("@");
    if (lastAt === -1) throw new Error("no @ in url");
    const authPart = afterProtocol.slice(0, lastAt);
    const hostPart = afterProtocol.slice(lastAt + 1);
    const colonInAuth = authPart.indexOf(":");
    const user = colonInAuth !== -1 ? authPart.slice(0, colonInAuth) : authPart;
    const password = colonInAuth !== -1 ? decodeURIComponent(authPart.slice(colonInAuth + 1)) : "";
    const slashInHost = hostPart.indexOf("/");
    const hostport = slashInHost !== -1 ? hostPart.slice(0, slashInHost) : hostPart;
    const database = slashInHost !== -1 ? hostPart.slice(slashInHost + 1).split("?")[0] : "postgres";
    const colonInHost = hostport.lastIndexOf(":");
    const host = colonInHost !== -1 ? hostport.slice(0, colonInHost) : hostport;
    const port = colonInHost !== -1 ? parseInt(hostport.slice(colonInHost + 1)) : 5432;
    return { user, password, host, port, database };
  } catch {
    return { connectionString: url };
  }
}

const isSupabaseOrNeon = rawUrl.includes("supabase") || rawUrl.includes("neon") || rawUrl.includes("sslmode=require");
const pgConfig = parsePgUrl(rawUrl);

export const pool = new Pool({
  ...pgConfig,
  ssl: isSupabaseOrNeon ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
