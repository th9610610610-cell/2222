import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runMigrations } from "@workspace/db/migrate";
import { db, usersTable, pool } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`)
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json({ ...data, db: "ok", ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "error", ts: new Date().toISOString() });
  }
});

// Migration endpoint — protected by ADMIN_MIGRATE_KEY env var
router.post("/migrate", async (req, res) => {
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  if (!dbUrl) return res.status(500).json({ error: "DATABASE_URL not set" });

  const expectedKey = process.env.ADMIN_MIGRATE_KEY;
  if (!expectedKey) return res.status(500).json({ error: "ADMIN_MIGRATE_KEY not configured" });

  const { key } = req.body || {};
  if (!key || key !== expectedKey) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    await runMigrations(dbUrl);
    res.json({ success: true, message: "Migrations applied successfully" });
  } catch (err: any) {
    console.error("[migrate endpoint]", err?.message);
    res.status(500).json({ error: "Migration failed" });
  }
});

// Bootstrap admin endpoint — set first admin by phone (requires JWT_SECRET as key)
router.post("/set-admin", async (req, res) => {
  const { phone, key } = req.body || {};
  const JWT_SECRET = process.env.JWT_SECRET || "";
  if (!key || key !== JWT_SECRET) {
    return res.status(403).json({ error: "Invalid key" });
  }
  if (!phone) return res.status(400).json({ error: "phone required" });
  try {
    const [user] = await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.phone, String(phone)))
      .returning({ id: usersTable.id, phone: usersTable.phone, role: usersTable.role });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to set admin" });
  }
});

export default router;
