import { Router } from "express";
import prisma from "../prisma";

const router = Router();

router.get("/tours", async (_req, res) => {
  const tours = await prisma.tour.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json({ items: tours });
});

router.post("/inquiries", async (req, res) => {
  const { email, destination, tourId, marketingConsent, gdprConsent, source } = req.body ?? {};
  const emailValue = String(email ?? "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  if (!emailOk) {
    return res.status(400).json({ error: "Invalid email." });
  }

  let tourIdValue: number | null = null;
  if (tourId !== undefined && tourId !== null && tourId !== "") {
    const parsed = Number(tourId);
    if (!Number.isFinite(parsed)) {
      return res.status(400).json({ error: "Invalid tour id." });
    }
    tourIdValue = parsed;
  }

  let destinationValue = destination ? String(destination).trim() : null;
  if (!destinationValue && tourIdValue) {
    const tour = await prisma.tour.findUnique({ where: { id: tourIdValue } });
    destinationValue = tour?.destination ?? null;
  }

  const existingLead = await prisma.lead.findFirst({
    where: { email: emailValue },
    orderBy: { createdAt: "desc" },
  });

  let lead;
  if (existingLead) {
    let newDestination = existingLead.destination;
    
    if (destinationValue) {
      if (!newDestination) {
        newDestination = destinationValue;
      } else {
        const destinations = newDestination.split(",").map((d) => d.trim());
        if (!destinations.includes(destinationValue)) {
          newDestination += `, ${destinationValue}`;
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
        createdAt: new Date(),
      },
    });
  } else {
    lead = await prisma.lead.create({
      data: {
        email: emailValue,
        destination: destinationValue,
        tourId: tourIdValue,
        marketingConsent: Boolean(marketingConsent),
        gdprConsent: Boolean(gdprConsent),
        source: source ? String(source) : null,
      },
    });
  }

  return res.status(201).json({ ok: true, item: lead });
});

export default router;
