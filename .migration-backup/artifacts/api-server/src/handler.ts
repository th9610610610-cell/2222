/**
 * Vercel serverless entry point.
 * Exports the Express app WITHOUT calling app.listen() — Vercel manages the server.
 * Built by esbuild into dist/handler.mjs so Vercel never needs to run tsc.
 */
import app from "./app";
import { runMigrations } from "@workspace/db/migrate";

// Run migrations on each cold start (idempotent — safe to run repeatedly)
runMigrations(process.env["DATABASE_URL"]!).catch((err) =>
  console.warn("[migrate] warning:", (err as Error)?.message),
);

export default app;
