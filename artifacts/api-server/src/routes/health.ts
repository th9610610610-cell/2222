import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { runMigrations } from "@workspace/db/migrate";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

// One-time admin seed — secured by JWT_SECRET key
router.post("/seed-admin", async (req: Request, res: Response): Promise<void> => {
  const { email, password, key } = req.body || {};
  const JWT_SECRET = process.env.JWT_SECRET || "";
  if (!key || key !== JWT_SECRET) {
    res.status(403).json({ error: "Invalid key" });
    return;
  }
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  try {
    const password_hash = await bcrypt.hash(String(password), 12);
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, String(email)))
      .limit(1);

    let user;
    if (existing.length > 0) {
      [user] = await db
        .update(usersTable)
        .set({ password_hash, role: "admin" })
        .where(eq(usersTable.email, String(email)))
        .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });
    } else {
      [user] = await db
        .insert(usersTable)
        .values({
          email: String(email),
          password_hash,
          role: "admin",
          phone: "admin_seed",
          full_name: "Admin",
        })
        .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });
    }
    res.json({ success: true, user });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error)?.message });
  }
});

export default router;
