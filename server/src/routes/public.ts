import { Router } from "express";
import prisma from "../prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { createLeadSchema } from "../validators/leads.js";
import { success } from "../lib/response.js";
import { hashEmail } from "../lib/hash.js";

const router = Router();

router.get(
  "/tours",
  asyncHandler(async (_req, res) => {
    const tours = await prisma.tour.findMany({
      where: { source: "manual" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    success(res, { items: tours });
  }),
);

router.post(
  "/inquiries",
  validateBody(createLeadSchema),
  asyncHandler(async (req, res) => {
    const { email, destination, tourId, marketingConsent, gdprConsent, source } = req.body;

    let tourIdValue: number | null = null;
    if (tourId !== undefined && tourId !== null && tourId !== "") {
      const parsed = Number(tourId);
      if (!Number.isFinite(parsed)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_TOUR_ID", message: "Invalid tour id." } });
        return;
      }
      tourIdValue = parsed;
    }

    let destinationValue = destination ? String(destination).trim() : null;
    if (!destinationValue && tourIdValue) {
      const tour = await prisma.tour.findUnique({ where: { id: tourIdValue } });
      destinationValue = tour?.destination ?? null;
    }

    const existingLead = await prisma.lead.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    let lead;
    if (existingLead) {
      let newDestination = existingLead.destination;

      if (destinationValue) {
        if (!newDestination) {
          newDestination = destinationValue;
        } else {
          const destinations = newDestination.split(",").map((d: string) => d.trim());
          if (!destinations.includes(destinationValue)) {
            destinations.push(destinationValue);
            // Keep at most 10 most recent destinations
            if (destinations.length > 10) {
              destinations.splice(0, destinations.length - 10);
            }
            newDestination = destinations.join(", ");
          }
        }
      }

      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          destination: newDestination,
          tourId: tourIdValue ?? existingLead.tourId,
          marketingConsent: existingLead.marketingConsent || Boolean(marketingConsent),
          gdprConsent: existingLead.gdprConsent || Boolean(gdprConsent),
          source: source ? String(source) : existingLead.source,
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          email,
          hashedEmail: hashEmail(email),
          destination: destinationValue,
          tourId: tourIdValue,
          marketingConsent: Boolean(marketingConsent),
          gdprConsent: Boolean(gdprConsent),
          source: source ? String(source) : null,
        },
      });
    }

    success(res, { item: lead }, 201);
  }),
);

export default router;
