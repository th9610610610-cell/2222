import express, { type Express } from "express";
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

// Trust proxy (needed when behind Vercel/nginx for correct IPs)
app.set('trust proxy', 1);

// Security headers with Helmet — CSP, HSTS, X-Frame-Options, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// CORS — only allow trusted origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (server-to-server, curl) in development only
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') return callback(null, true)
      return callback(new Error('No origin'), false)
    }
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Strict auth rate limiter (register + login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// Ticket purchase rate limiter
const ticketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ticket purchase attempts. Please slow down.' },
});
app.use('/api/tickets', ticketLimiter);

// Request logging with sensitive field redaction
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
        return {
          statusCode: res["statusCode"],
        };
      },
    },
  }),
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use("/api", router);

export default app;
