import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Temporary debug endpoint — remove after fixing DB connection
router.get("/debug-env", (_req, res) => {
  const dbUrl = process.env.DATABASE_URL || "";
  let parsed: Record<string, string> = { raw_length: String(dbUrl.length) };
  try {
    const u = new URL(dbUrl);
    parsed = {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      has_password: u.password ? "yes" : "no",
      search: u.search,
    };
  } catch (e: any) {
    parsed.parse_error = e?.message;
    parsed.first_20_chars = dbUrl.substring(0, 20);
  }
  res.json({ db_url: parsed, has_jwt: !!process.env.JWT_SECRET, node_env: process.env.NODE_ENV });
});

export default router;
