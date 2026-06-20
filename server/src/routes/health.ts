import { Router } from "express";
import prisma from "../prisma.js";
import { config } from "../config.js";

const router = Router();

// Liveness — no dependencies
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// New: dedicated liveness endpoint
router.get("/health/live", (_req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

// Readiness — structured health checks
router.get("/health/ready", async (_req, res) => {
  const checks: Record<string, string> = {};
  let overallStatus = "ok";

  // 1. Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "failed";
    overallStatus = "down";
  }

  // 2-3. External API reachability (best-effort, 3s timeout)
  if (config.alexandria?.url) {
    try {
      const resp = await fetch(config.alexandria.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
      checks.alexandria = resp.ok ? "ok" : "degraded";
    } catch {
      checks.alexandria = "failed";
      if (overallStatus === "ok") overallStatus = "degraded";
    }
  }

  // 4. Memory check
  const mem = process.memoryUsage();
  const memRssMB = Math.round(mem.rss / 1024 / 1024);
  checks.memory = memRssMB > 400 ? `high (${memRssMB}MB)` : `ok (${memRssMB}MB)`;
  if (memRssMB > 400 && overallStatus === "ok") overallStatus = "degraded";

  // 5. Uptime
  checks.uptime = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

  // 6. Backup check (best-effort)
  try {
    const { execSync } = await import("node:child_process");
    const result = execSync("bash scripts/verify-backup.sh", { timeout: 5000, encoding: "utf8" });
    checks.backup = result.includes("PASS") ? "ok" : "degraded";
  } catch {
    checks.backup = "skipped";
  }

  const statusCode = overallStatus === "down" ? 503 : 200;
  res.status(statusCode).json({ status: overallStatus, checks, timestamp: new Date().toISOString() });
});

export default router;
