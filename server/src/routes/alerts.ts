import { Router } from "express";
import prisma from "../prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import rateLimit from "express-rate-limit";

const router = Router();

const alertLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

router.post(
  "/",
  alertLimiter,
  asyncHandler(async (req, res) => {
    const { email, providerId, externalId, tourTitle, priceMax } = req.body as {
      email?: string;
      providerId?: string;
      externalId?: string;
      tourTitle?: string;
      priceMax?: number;
    };

    if (!email || !providerId || !externalId || !priceMax) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    if (typeof priceMax !== "number" || priceMax <= 0) {
      return res.status(400).json({ error: "Invalid priceMax" });
    }

    // Prevent duplicate active alerts for same email + tour
    const existing = await prisma.priceAlert.findFirst({
      where: { email, providerId, externalId, triggered: false },
    });
    if (existing) {
      return res.json({ ok: true, message: "Alert already registered" });
    }

    await prisma.priceAlert.create({
      data: {
        email,
        providerId,
        externalId,
        tourTitle: tourTitle ?? "",
        priceMax,
      },
    });

    return res.json({ ok: true });
  })
);

export default router;
