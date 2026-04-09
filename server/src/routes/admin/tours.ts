import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const tours = await prisma.tour.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json({ items: tours });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { destination, title, price, image, description, photos, startDate, endDate, transport, i18n } =
    req.body ?? {};

  if (!destination || !title || !price || !image || !startDate || !endDate || !transport) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: "Invalid date range." });
  }

  const created = await prisma.tour.create({
    data: {
      destination: String(destination),
      title: String(title),
      price: Number(price),
      image: String(image),
      description: description ? String(description) : null,
      photos: photos ?? null,
      startDate: start,
      endDate: end,
      transport: String(transport),
      i18n: i18n ?? null,
      sortOrder: await prisma.tour.count(),
    },
  });

  res.status(201).json({ item: created });
}));

router.put("/order", asyncHandler(async (req, res) => {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const idsFromBody = body?.ids ?? body;
  const idsFromQuery =
    typeof req.query.ids === "string" ? req.query.ids.split(",") : [];
  const rawIds = Array.isArray(idsFromBody)
    ? idsFromBody
    : Array.isArray(idsFromQuery) && idsFromQuery.length > 0
      ? idsFromQuery
      : [];

  const numericIds = rawIds
    .map((id: unknown) => Number(id))
    .filter((id: number) => Number.isFinite(id));

  if (numericIds.length === 0) {
    return res.status(400).json({ error: "Invalid ids." });
  }

  const updates = numericIds.map((id: number, index: number) =>
    prisma.tour.update({ where: { id }, data: { sortOrder: index } }),
  );
  await prisma.$transaction(updates);
  res.json({ ok: true });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  const { destination, title, price, image, description, photos, startDate, endDate, transport, i18n } =
    req.body ?? {};

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
    return res.status(400).json({ error: "Invalid date range." });
  }

  const updated = await prisma.tour.update({
    where: { id },
    data: {
      destination: destination ? String(destination) : undefined,
      title: title ? String(title) : undefined,
      price: price !== undefined ? Number(price) : undefined,
      image: image ? String(image) : undefined,
      description: description === undefined ? undefined : description ? String(description) : null,
      photos: photos === undefined ? undefined : photos,
      startDate: start ?? undefined,
      endDate: end ?? undefined,
      transport: transport ? String(transport) : undefined,
      i18n: i18n === undefined ? undefined : i18n,
    },
  });

  res.json({ item: updated });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }
  await prisma.tour.delete({ where: { id } });
  res.status(204).send();
}));

export default router;
