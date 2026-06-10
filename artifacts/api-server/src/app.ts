import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmetLib from "helmet";
import rateLimitLib from "express-rate-limit";
import pinoHttpLib from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// Handle both CJS default and named exports across environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const helmet: any = (helmetLib as any).default ?? helmetLib;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rateLimit: any = (rateLimitLib as any).default ?? rateLimitLib;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoHttp: any = (pinoHttpLib as any).default ?? pinoHttpLib;

const app: Express = express();

// Security headers — enable all protections, tune CSP for API-only
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Remove X-Powered-By header
app.disable('x-powered-by');

// CORS — allow same-origin + Replit dev/preview domains only
const allowedOriginPattern = /^https:\/\/[a-z0-9-]+\.replit\.dev(:[0-9]+)?$|^https?:\/\/localhost(:[0-9]+)?$/;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Same-origin / server-to-server
    const explicit = process.env.ALLOWED_ORIGIN;
    if (explicit && origin === explicit) return cb(null, true);
    if (allowedOriginPattern.test(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Rate limiters
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// Strict rate limiter for admin mutations
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests, please try again later.' },
});
app.use('/api/admin', adminLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Record<string, unknown>) {
        return {
          id: req["id"],
          method: req["method"],
          url: typeof req["url"] === "string" ? req["url"].split("?")[0] : req["url"],
        };
      },
      res(res: Record<string, unknown>) {
        return { statusCode: res["statusCode"] };
      },
    },
  }),
);

// Body parsers with size limits to prevent payload attacks
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use("/api", router);

// Global error handler — never expose stack traces to clients
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: err.message }, 'Unhandled error');
  const status = (err as any).status || 500;
  if (status === 400 && err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.status(status).json({ error: status < 500 ? err.message : 'Internal server error' });
});

export default app;
