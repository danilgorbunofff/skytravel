import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { createTourSchema, updateTourSchema, reorderToursSchema } from "../../validators/tours.js";
import { success, fail } from "../../lib/response.js";
import { logAdminAction } from "../../middleware/auditLog.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tours = await prisma.tour.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    success(res, { items: tours });
  }),
);

router.post(
  "/",
  validateBody(createTourSchema),
  asyncHandler(async (req, res) => {
    const {
      destination,
      title,
      price,
      image,
      description,
      photos,
      startDate,
      endDate,
      transport,
      i18n,
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      fail("INVALID_DATES", "Invalid date range.", 400);
    }

    const created = await prisma.tour.create({
      data: {
        destination,
        title,
        price,
        image,
        description: description ?? null,
        photos: photos ?? null,
        startDate: start,
        endDate: end,
        transport,
        i18n: i18n ?? null,
        sortOrder: await prisma.tour.count(),
      },
    });

    success(res, { item: created }, 201);
  }),
);

router.put(
  "/order",
  validateBody(reorderToursSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;

    const numericIds = ids
      .map((id: unknown) => Number(id))
      .filter((id: number) => Number.isFinite(id));

    if (numericIds.length === 0) {
      fail("INVALID_IDS", "Invalid ids.", 400);
    }

    const updates = numericIds.map((id: number, index: number) =>
      prisma.tour.update({ where: { id }, data: { sortOrder: index } }),
    );
    await prisma.$transaction(updates);
    success(res, null);
  }),
);

router.put(
  "/:id",
  validateBody(updateTourSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      fail("INVALID_ID", "Invalid id.", 400);
    }

    const {
      destination,
      title,
      price,
      image,
      description,
      photos,
      startDate,
      endDate,
      transport,
      i18n,
    } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      fail("INVALID_DATES", "Invalid date range.", 400);
    }

    const updated = await prisma.tour.update({
      where: { id },
      data: {
        destination: destination ?? undefined,
        title: title ?? undefined,
        price: price !== undefined ? Number(price) : undefined,
        image: image ?? undefined,
        description:
          description === undefined ? undefined : description ? String(description) : null,
        photos: photos === undefined ? undefined : photos,
        startDate: start ?? undefined,
        endDate: end ?? undefined,
        transport: transport ?? undefined,
        i18n: i18n === undefined ? undefined : i18n,
      },
    });

    success(res, { item: updated });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      fail("INVALID_ID", "Invalid id.", 400);
    }
    await prisma.tour.delete({ where: { id } });
    await logAdminAction({
      action: "TOUR_DELETE",
      target: `Tour#${id}`,
      adminUser: req.session.adminLogin || "unknown",
      ip: req.ip,
    });
    res.status(204).send();
  }),
);

export default router;
