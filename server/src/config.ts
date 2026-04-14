const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET must be set in production.");
  process.exit(1);
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  get allowedOrigins() {
    return this.clientOrigin.split(",").map((s) => s.trim()).filter(Boolean);
  },

  admin: {
    login: process.env.ADMIN_LOGIN,
    password: process.env.ADMIN_PASSWORD,
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

  orextravel: {
    url: process.env.OREXTRAVEL_API_URL || "https://search.orextravel.cz/export/default.php",
    token: process.env.OREXTRAVEL_TOKEN || "",
    townFrom: Number(process.env.OREXTRAVEL_TOWN_FROM || 0),
  },
} as const;
