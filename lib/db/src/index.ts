import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const url = process.env.DATABASE_URL || "postgresql://localhost/lotto-win-placeholder";

// Manually parse the DB URL to avoid Node's `new URL()` failing on
// Supabase/Replit URLs where the username contains a dot (e.g. postgres.xxxx).
function parsePgUrl(raw: string): pg.PoolConfig {
  try {
    const protocolEnd = raw.indexOf("://");
    if (protocolEnd === -1) return { connectionString: raw };
    const afterProtocol = raw.slice(protocolEnd + 3);
    const lastAt = afterProtocol.lastIndexOf("@");
    if (lastAt === -1) return { connectionString: raw };
    const authPart = afterProtocol.slice(0, lastAt);
    const hostPart = afterProtocol.slice(lastAt + 1);
    const colonInAuth = authPart.indexOf(":");
    const user = colonInAuth !== -1 ? authPart.slice(0, colonInAuth) : authPart;
    const rawPass = colonInAuth !== -1 ? authPart.slice(colonInAuth + 1) : "";
    const password = (rawPass.includes("%") ? decodeURIComponent(rawPass) : rawPass).trim();
    const slashInHost = hostPart.indexOf("/");
    const hostport = slashInHost !== -1 ? hostPart.slice(0, slashInHost) : hostPart;
    const database = slashInHost !== -1 ? hostPart.slice(slashInHost + 1).split("?")[0] : "postgres";
    const colonInHost = hostport.lastIndexOf(":");
    const host = colonInHost !== -1 ? hostport.slice(0, colonInHost) : hostport;
    const port = colonInHost !== -1 ? parseInt(hostport.slice(colonInHost + 1)) : 5432;
    return { user, password, host, port, database };
  } catch {
    return { connectionString: raw };
  }
}

const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const config = parsePgUrl(url);

export const pool = new Pool({
  ...config,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
