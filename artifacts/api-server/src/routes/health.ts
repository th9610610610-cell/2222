import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runMigrations } from "@workspace/db/migrate";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req: Request, res: Response): void => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.post("/migrate", async (_req: Request, res: Response): Promise<void> => {
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  if (!dbUrl) {
    res.status(500).json({ error: "DATABASE_URL not set" });
    return;
  }
  try {
    await runMigrations(dbUrl);
    res.json({ success: true, message: "Migrations applied successfully" });
  } catch (err: unknown) {
    console.error("[migrate endpoint]", err);
    res.status(500).json({ error: "Migration failed", detail: (err as Error)?.message });
  }
});

router.post("/set-admin", async (req: Request, res: Response): Promise<void> => {
  const { phone, key } = req.body || {};
  const JWT_SECRET = process.env.JWT_SECRET || "";
  if (!key || key !== JWT_SECRET) {
    res.status(403).json({ error: "Invalid key" });
    return;
  }
  if (!phone) {
    res.status(400).json({ error: "phone required" });
    return;
  }
  try {
    const [user] = await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.phone, String(phone)))
      .returning({ id: usersTable.id, phone: usersTable.phone, role: usersTable.role });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ success: true, user });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error)?.message });
  }
});

export default router;
