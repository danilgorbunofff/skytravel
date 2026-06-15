import express from "express";
import crypto from "node:crypto";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import session from "express-session";
import path from "node:path";
import { config } from "./config.js";
import { ApiError } from "./lib/ApiError.js";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import { Prisma } from "./generated/prisma/client/client.js";
import { sessionStore } from "./lib/sessionStore.js";
import publicRoutes from "./routes/public.js";
import alexandriaPublicRoutes from "./routes/alexandriaPublic.js";
import providerSearchPublicRoutes from "./routes/providerSearchPublic.js";
import adminRoutes from "./routes/admin/index.js";
import alertsRouter from "./routes/alerts.js";
import erasureRouter from "./routes/erasure.js";
import { searchTimingMiddleware } from "./middleware/searchTiming.js";
import healthRoutes from "./routes/health.js";
import sitemapRouter from "./routes/sitemap.xml.js";
import { csrfTokenMiddleware, csrfProtectionMiddleware } from "./middleware/csrf.js";

// Sentry — disabled unless SENTRY_DSN is configured
if (process.env.SENTRY_DSN) {
  console.warn("[sentry] SENTRY_DSN is set but Sentry SDK is not installed. Install @sentry/node to enable error tracking.");
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // ── Security headers ──────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", ...config.allowedOrigins],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  // ── Response compression ──────────────────────────────────────────────
  app.use(compression());

  // ── Structured request logging (pino-http) ──────────────────────────
  app.use(
    pinoHttp({
      logger,
      genReqId: () => crypto.randomUUID(),
      autoLogging: {
        ignore: (req) => req.url?.startsWith("/api/health"),
      },
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          id: req.id,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
      customLogLevel: (res, err) => {
        const code = res.statusCode ?? 500;
        if (code >= 500) return "error";
        if (code >= 400) return "warn";
        return "info";
      },
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.isProd ? config.allowedOrigins : true,
      credentials: true,
      exposedHeaders: ["Server-Timing", "X-Cache", "ETag"],
    }),
  );

  // ── Per-route timing/logging for the public search endpoints ─────────
  app.use(searchTimingMiddleware);

  // ── Health checks (no auth, no rate limit) ─────────────────────────
  app.use("/api", healthRoutes);

  // ── Body parsing ──────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));

  // ── Session ───────────────────────────────────────────────────────────
  app.use(
    session({
      store: sessionStore,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: config.isProd ? "strict" : "lax",
        secure: config.isProd,
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
    }),
  );

  // ── CSRF token generation ────────────────────────────────────────────
  app.use(csrfTokenMiddleware);

  // ── Rate limiters ─────────────────────────────────────────────────────
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." },
    },
  });

  const inquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
    },
  });

  const publicSearchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many search requests. Try again later." },
    },
  });

  const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
    },
  });

  const toursLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: config.isProd ? 30 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many tour requests. Try again later." },
    },
  });

  app.use("/api/admin/login", loginLimiter);
  app.use("/api/inquiries", inquiryLimiter);
  app.use("/api/search", publicSearchLimiter);
  app.use("/api/admin", adminLimiter);

  // ── Static uploads ────────────────────────────────────────────────────
  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), "uploads"), {
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );

  if (!config.isProd) {
    app.get("/api/test-ip", async (_req, res) => {
      try {
        const response = await fetch("https://api64.ipify.org?format=json");
        const data = (await response.json()) as { ip: string };
        res.json({ outboundIp: data.ip });
      } catch {
        res.status(500).json({ error: "Failed to discover outbound IP" });
      }
    });
  }

  app.use("/api", publicRoutes);
  app.use("/api/alexandria", alexandriaPublicRoutes);
  app.use("/api/search", (req, res, next) => {
    if (req.path === "/bootstrap") return next();
    toursLimiter(req, res, next);
  }, providerSearchPublicRoutes);
  app.use("/api/admin", csrfProtectionMiddleware);
  app.use("/api/admin", adminRoutes);
  app.use("/api/alerts", alertsRouter);

  const erasureLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
    },
  });
  app.use("/api/erasure", erasureLimiter, erasureRouter);

  // ── Sitemap ───────────────────────────────────────────────────────────
  app.use(sitemapRouter);

  // ── 404 handler ───────────────────────────────────────────────────────
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } });
  });

  // ── Centralized error handler ─────────────────────────────────────────
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof ApiError) {
        res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
        return;
      }

      if (err.name === "ZodError") {
        res
          .status(400)
          .json({ ok: false, error: { code: "VALIDATION_ERROR", message: err.message } });
        return;
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error({ err }, "Prisma error");
        res
          .status(409)
          .json({ ok: false, error: { code: "DB_ERROR", message: "Database conflict" } });
        return;
      }

      logger.error({ err }, "Unhandled error");
      res.status(500).json({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: config.isProd ? "Internal server error" : err.message,
        },
      });
    },
  );

  return app;
}
