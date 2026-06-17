import type { IncomingMessage, ServerResponse } from "node:http";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";
import { runMigrations } from "@workspace/db/migrate";

// Build a slim Express app without pino (no worker-thread deps) for Vercel serverless
function buildApp(): Express {
  const app: Express = express();

  app.set("trust proxy", 1);

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} not allowed`), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));

  // Simple request logger (no pino worker threads)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url?.split("?")[0]}`);
    next();
  });

  app.use("/api", router);

  return app;
}

let _app: Express | null = null;
function getApp() {
  if (!_app) _app = buildApp();
  return _app;
}

let migrated = false;
async function ensureMigrated() {
  if (migrated) return;
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) return;
  await runMigrations(url);
  migrated = true;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await ensureMigrated().catch((err) =>
      console.warn("[migrate] warning:", (err as Error)?.message)
    );
  } catch (_) {
    // ignore migration errors — app still starts
  }
  const app = getApp();
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
