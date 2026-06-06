import app from "../src/app";
import { runMigrations } from "@workspace/db/migrate";

// Run migrations on cold start — safe to call multiple times
runMigrations(process.env.DATABASE_URL!).catch((err) =>
  console.warn("[migrate] warning:", err?.message),
);

export default app;
