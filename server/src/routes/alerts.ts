import { Router } from "express";
import prisma from "../prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { createAlertSchema } from "../validators/alerts.js";
import { success } from "../lib/response.js";
import { hashEmail } from "../lib/hash.js";
import rateLimit from "express-rate-limit";

const router = Router();

const alertLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
  },
});

router.post(
  "/",
  alertLimiter,
  validateBody(createAlertSchema),
  asyncHandler(async (req, res) => {
    const { email, providerId, externalId, tourTitle, priceMax } = req.body;

    // Prevent duplicate active alerts for same email + tour
    const existing = await prisma.priceAlert.findFirst({
      where: { email, providerId, externalId, triggered: false },
    });
    if (existing) {
      success(res, { message: "Alert already registered" });
      return;
    }

    await prisma.priceAlert.create({
      data: {
        email,
        hashedEmail: hashEmail(email),
        providerId,
        externalId,
        tourTitle: tourTitle ?? "",
        priceMax,
      },
    });

    success(res, null, 201);
  }),
);

export default router;
