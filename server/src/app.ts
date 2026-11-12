import express, { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
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
import blogRouter from "./routes/blog.js";
import ssrPagesRouter from "./routes/ssrPages.js";
import leadsRouter from "./routes/leads.js";
import { SSR_INTERNAL_HEADER, SSR_INTERNAL_TOKEN } from "./ssr/pageData.js";
import { csrfTokenMiddleware, csrfProtectionMiddleware } from "./middleware/csrf.js";
import { siteSettingsPublicRouter } from "./routes/siteSettings.js";

// Sentry — disabled unless SENTRY_DSN is configured
if (process.env.SENTRY_DSN) {
  console.warn(
    "[sentry] SENTRY_DSN is set but Sentry SDK is not installed. Install @sentry/node to enable error tracking.",
  );
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
      customLogLevel: (res, _err) => {
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

  // ── Blog static assets (served before session so /assets never
  //    touches the session store). The blog router itself is mounted
  //    before the session middleware further down for the same reason.
  //    Blog pages are pure SSR with no auth, no forms, no cookies, so
  //    involving the MySQL session store on every anonymous visit is
  //    both unnecessary and (in dev) a hard DB dependency.
  //    `/assets/blog.css` needs no special route: it is a hashed-URL static
  //    file below, served with a long cache lifetime.
  const publicAssetRoot = path.resolve(process.cwd(), "../client/public");
  if (fs.existsSync(publicAssetRoot)) {
    app.use(
      "/assets",
      express.static(publicAssetRoot + "/assets", {
        setHeaders: (res) => {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      }),
    );
    app.use(
      "/images",
      express.static(publicAssetRoot + "/images", {
        setHeaders: (res) => {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      }),
    );
  }

  // Built client assets (hashed JS/CSS). In production nginx serves these
  // from client/dist directly; this keeps a plain `node dist/index.js`
  // (local SSR testing, e2e) fully working too.
  const clientDistAssets = path.resolve(
    process.env.CLIENT_DIST_DIR ?? path.resolve(process.cwd(), "../client/dist"),
    "assets",
  );
  if (fs.existsSync(clientDistAssets)) {
    app.use(
      "/assets",
      express.static(clientDistAssets, {
        setHeaders: (res) => {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      }),
    );
  }

  // ── Blog router mounted before session/CSRF — see block above. ──
  app.use("/blog", blogRouter);

  // ── Server-rendered public pages (/, /cs/…, /ru/…), sitemap, robots,
  //    IndexNow key. Anonymous + cacheable, so mounted before the session.
  app.use(sitemapRouter);
  app.use(ssrPagesRouter);

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
  const skipLimit = config.disableRateLimit;
  const passthrough = ((_req: Request, _res: Response, next: NextFunction) => next()) as ReturnType<
    typeof rateLimit
  >;

  const loginLimiter = skipLimit
    ? passthrough
    : rateLimit({
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

  // Loopback requests made by the SSR renderer (ssr/pageData.ts) carry a
  // per-process token and must not eat into visitors' rate-limit budget.
  const isSsrInternal = (req: Request) => req.get(SSR_INTERNAL_HEADER) === SSR_INTERNAL_TOKEN;

  const publicSearchLimiter = rateLimit({
    skip: isSsrInternal,
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

  const toursLimiter =
    !config.isProd || config.disableRateLimit
      ? (_req: Request, _res: Response, next: NextFunction) => next()
      : rateLimit({
          skip: isSsrInternal,
          windowMs: 15 * 60 * 1000,
          max: 30,
          standardHeaders: true,
          legacyHeaders: false,
          message: {
            ok: false,
            error: { code: "RATE_LIMITED", message: "Too many tour requests. Try again later." },
          },
        });

  app.use("/api/admin/login", loginLimiter);
  app.use("/api/inquiries", inquiryLimiter);
  app.use("/api/leads", inquiryLimiter, leadsRouter);
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

  app.use("/api/site-settings", siteSettingsPublicRouter);
  app.use("/api", publicRoutes);
  app.use("/api/alexandria", alexandriaPublicRoutes);
  app.use(
    "/api/search",
    (req, res, next) => {
      if (req.path === "/bootstrap") return next();
      toursLimiter(req, res, next);
    },
    providerSearchPublicRoutes,
  );
  app.use("/api/admin", csrfProtectionMiddleware);
  app.use("/api/admin", adminRoutes);
  app.use("/api/alerts", alertsRouter);

  const erasureLimiter = skipLimit
    ? passthrough
    : rateLimit({
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
