import { Router } from "express";
import prisma from "../prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { success, fail } from "../lib/response.js";
import { z } from "zod";

const router = Router();

const erasureSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/erasure
 * GDPR Right to Erasure — deletes all personal data associated with an email.
 * Removes: leads, price alerts.
 */
router.post(
  "/",
  validateBody(erasureSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const [deletedLeads, deletedAlerts] = await prisma.$transaction([
      prisma.lead.deleteMany({ where: { email } }),
      prisma.priceAlert.deleteMany({ where: { email } }),
    ]);

    if (deletedLeads.count === 0 && deletedAlerts.count === 0) {
      fail("NOT_FOUND", "No data found for this email address.", 404);
    }

    success(res, {
      deleted: {
        leads: deletedLeads.count,
        priceAlerts: deletedAlerts.count,
      },
    });
  }),
);

export default router;
