import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

// Liveness probe — is the process running?
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness probe — can it serve traffic?
router.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ready",
      checks: {
        database: "ok",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  } catch {
    res.status(503).json({
      status: "not ready",
      checks: { database: "failed" },
    });
  }
});

export default router;
