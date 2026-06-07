import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runMigrations } from "@workspace/db/migrate";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Migration endpoint — runs all DB migrations idempotently
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
    res.status(500).json({ error: err?.message });
  }
});

export default router;
