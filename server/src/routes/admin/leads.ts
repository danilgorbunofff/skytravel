import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { success, fail } from "../../lib/response.js";
import { logAdminAction } from "../../middleware/auditLog.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const segment = String(req.query.segment ?? "all");
    const where =
      segment === "consented"
        ? { marketingConsent: true }
        : segment === "pending"
          ? { marketingConsent: false }
          : {};
    const limitRaw = Number(req.query.limit ?? 500);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit = Math.min(1000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 500));
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0);
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    const whereWithSearch = qRaw
      ? {
          ...where,
          OR: [{ email: { contains: qRaw } }, { destination: { contains: qRaw } }],
        }
      : where;

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where: whereWithSearch }),
      prisma.lead.findMany({
        where: whereWithSearch,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);
    success(res, { items: leads, total, limit, offset });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      fail("INVALID_ID", "Invalid id.", 400);
    }
    await prisma.lead.delete({ where: { id } });
    await logAdminAction({
      action: "LEAD_DELETE",
      target: `Lead#${id}`,
      adminUser: req.session.adminLogin || "unknown",
      ip: req.ip,
    });
    res.status(204).send();
  }),
);

export default router;
