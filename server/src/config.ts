import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().optional().default("dev-secret"),
  CLIENT_ORIGIN: z.string().optional().default("http://localhost:5173"),
  ADMIN_LOGIN: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("FATAL: Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

// Production-only checks
if (env.NODE_ENV === "production") {
  if (env.SESSION_SECRET === "dev-secret" || env.SESSION_SECRET.length < 32) {
    console.error("FATAL: SESSION_SECRET must be at least 32 chars in production");
    process.exit(1);
  }
}

const isProd = env.NODE_ENV === "production";

if (!isProd && env.SESSION_SECRET === "dev-secret") {
  console.warn("[config] ⚠ Using default SESSION_SECRET 'dev-secret' in non-production. Set a strong secret for realistic security.");
}

export const config = {
  isProd,
  port: env.PORT,
  sessionSecret: env.SESSION_SECRET,
  databaseUrl: env.DATABASE_URL,
  clientOrigin: env.CLIENT_ORIGIN,
  get allowedOrigins() {
    return this.clientOrigin
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },

  admin: {
    login: env.ADMIN_LOGIN,
    password: env.ADMIN_PASSWORD,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    get isConfigured() {
      return Boolean(this.host && this.user && this.pass);
    },
  },

  alexandria: {
    url: process.env.ALEXANDRIA_API_URL || "http://export.alexandria.cz/export",
    apiKey: process.env.ALEXANDRIA_API_KEY || "",
    country: Number(process.env.ALEXANDRIA_COUNTRY || 107),
  },

} as const;

// ── Startup warnings for optional but important config ────────────────
function validateConfig() {
  const warnings: string[] = [];

  if (!config.clientOrigin || config.clientOrigin === "http://localhost:5173") {
    if (isProd) warnings.push("CLIENT_ORIGIN is not set — CORS may block requests.");
  }

  if (!config.smtp.isConfigured) {
    warnings.push(
      "SMTP is not configured — email features disabled (SMTP_HOST, SMTP_USER, SMTP_PASS).",
    );
  }

  if (!config.alexandria.apiKey) {
    warnings.push("ALEXANDRIA_API_KEY is not set — Alexandria provider will fail.");
  }

  for (const w of warnings) {
    console.warn(`[config] ⚠ ${w}`);
  }
}

validateConfig();
