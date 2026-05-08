import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import path from "node:path";
import bcrypt from "bcrypt";
import { config } from "./config.js";
import publicRoutes from "./routes/public.js";
import alexandriaPublicRoutes from "./routes/alexandriaPublic.js";
import providerSearchPublicRoutes from "./routes/providerSearchPublic.js";
import adminRoutes from "./routes/admin/index.js";
import prisma from "./prisma.js";

const app = express();
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ── CORS ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.isProd ? config.allowedOrigins : true,
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Session ───────────────────────────────────────────────────────────
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: config.isProd ? "none" : "lax",
      secure: config.isProd,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// ── Rate limiters ─────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

const publicSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many search requests. Try again later." },
});

app.use("/api/admin/login", loginLimiter);
app.use("/api/inquiries", inquiryLimiter);
app.use("/api/search", publicSearchLimiter);

// ── Static uploads ────────────────────────────────────────────────────
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/test-ip", async (_req, res) => {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = (await response.json()) as { ip: string };
    res.json({ outboundIp: data.ip });
  } catch {
    res.status(500).json({ error: "Failed to discover outbound IP" });
  }
});

app.use("/api", publicRoutes);
app.use("/api/alexandria", alexandriaPublicRoutes);
app.use("/api/search", providerSearchPublicRoutes);
app.use("/api/admin", adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Centralized error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: config.isProd ? "Internal server error" : err.message });
});

async function ensureAdminUser() {
  const { login, password } = config.admin;
  if (!login || !password) {
    console.warn("ADMIN_LOGIN or ADMIN_PASSWORD is missing. Admin login disabled.");
    return;
  }
  const existing = await prisma.adminUser.findUnique({ where: { login } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { login, passwordHash } });
  console.log(`Admin user '${login}' created.`);
}

ensureAdminUser()
  .catch((error) => {
    console.error("Failed to ensure admin user:", error);
  })
  .finally(() => {
    app.listen(config.port, () => {
      console.log(`SkyTravel API running on http://localhost:${config.port}`);

      // ── Cache warming (fire-and-forget) ───────────────────────────
      const warmOnStartup = process.env.PROVIDERS_WARM_ON_STARTUP !== "false";
      void (async () => {
        const { getAllProviders, getProvider } = await import("./providers/index.js");
        const all = getAllProviders();

        // Always load DB cache status so getCacheStatus() works (in parallel)
        await Promise.allSettled(
          all.map(async (meta) => {
            try {
              const provider = getProvider(meta.id) as any;
              if (typeof provider.loadCacheStatus === "function") {
                await provider.loadCacheStatus();
              }
            } catch { /* ignore */ }
          }),
        );

        if (warmOnStartup) {
          // Warm all providers in parallel — each is an independent network/DB
          // workload; serializing them was wasting startup time for no reason.
          await Promise.allSettled(
            all.map(async (meta) => {
              const start = Date.now();
              try {
                const provider = getProvider(meta.id);
                await provider.warmCache();
                const status = provider.getCacheStatus();
                console.log(
                  `[Cache] ${meta.id} warmed: ${status.itemCount} items in ${Date.now() - start}ms`,
                );
              } catch (err) {
                console.error(`[Cache] ${meta.id} warm failed:`, err);
              }
            }),
          );
        }

        // Set up background refresh intervals (staggered to avoid all
        // providers refreshing at the same instant).
        all.forEach((meta, idx) => {
          const provider = getProvider(meta.id);
          const mins = Math.round(provider.refreshIntervalMs / 60_000);
          const initialDelay = (idx + 1) * 30_000; // 30s, 60s, ...
          setTimeout(() => {
            setInterval(() => {
              provider.warmCache().catch((err) =>
                console.error(`[Cache] ${meta.id} background refresh failed:`, err),
              );
            }, provider.refreshIntervalMs);
            // Trigger one immediate refresh after the stagger so cold deploys
            // don't have to wait the full interval.
            provider.warmCache().catch(() => { /* logged elsewhere */ });
          }, initialDelay);
          console.log(`[Cache] ${meta.id} will refresh every ${mins} min (first run in ${Math.round(initialDelay / 1000)}s)`);
        });
      })();
    });
  });
