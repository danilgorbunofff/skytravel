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

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    success(res, { items: leads });
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
