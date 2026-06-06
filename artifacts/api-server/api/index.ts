import app from "../src/app";
import { runMigrations } from "@workspace/db/migrate";

// Run migrations on cold start — safe to call multiple times
runMigrations(process.env.DATABASE_URL!).catch((err: unknown) =>
  console.warn("[migrate] warning:", (err as Error)?.message),
);

export default app;
