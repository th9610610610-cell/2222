import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runMigrations } from "@workspace/db/migrate";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Manual migration trigger endpoint
router.post("/migrate", async (_req, res) => {
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  if (!dbUrl) return res.status(500).json({ error: "DATABASE_URL not set" });
  try {
    await runMigrations(dbUrl);
    res.json({ success: true, message: "Migrations applied successfully" });
  } catch (err: any) {
    console.error("[migrate endpoint]", err);
    res.status(500).json({ error: "Migration failed", detail: err?.message });
  }
});

export default router;
