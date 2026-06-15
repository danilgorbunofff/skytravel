import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { success } from "../../lib/response.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const action = req.query.action as string | undefined;
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const where: Record<string, unknown> = {};
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const total = await prisma.auditLog.count({ where });

    success(res, { logs, total });
  }),
);

export default router;
