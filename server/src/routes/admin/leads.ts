import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
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
  res.json({ items: leads });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }
  await prisma.lead.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
