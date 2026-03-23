import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "node:path";
import bcrypt from "bcrypt";
import publicRoutes from "./routes/public";
import adminRoutes from "./routes/admin";
import prisma from "./prisma";

const app = express();
const port = Number(process.env.PORT) || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = clientOrigin.split(",").map((item) => item.trim()).filter(Boolean);
const allowAllOrigins = process.env.CORS_ALLOW_ALL === "true" || process.env.NODE_ENV !== "production";
const sessionSecret = process.env.SESSION_SECRET || "dev-secret";

app.use(
  cors({
    origin: allowAllOrigins ? true : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

async function ensureAdminUser() {
  const login = process.env.ADMIN_LOGIN;
  const password = process.env.ADMIN_PASSWORD;
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
    app.listen(port, () => {
      console.log(`SkyTravel API running on http://localhost:${port}`);
    });
  });
