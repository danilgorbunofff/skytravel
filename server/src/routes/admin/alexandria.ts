import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  fetchAlexandriaRaw,
  fetchAlexandriaParsed,
  mapAlexandriaItem,
} from "../../lib/alexandria.js";

const router = Router();

router.get("/preview", asyncHandler(async (req, res) => {
  const countryId = req.query.zeme !== undefined ? Number(req.query.zeme) : undefined;
  const raw = await fetchAlexandriaRaw(countryId);
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.send(raw);
}));

router.get("/preview/json", asyncHandler(async (req, res) => {
  const countryId = req.query.zeme !== undefined ? Number(req.query.zeme) : undefined;
  const parsed = await fetchAlexandriaParsed(countryId);
  res.json(parsed);
}));

router.post("/import", asyncHandler(async (req, res) => {
  const countryId = req.body?.zeme !== undefined ? Number(req.body.zeme) : undefined;
  const dryRun = Boolean(req.body?.dryRun);

  const parsed = await fetchAlexandriaParsed(countryId);

  const root = parsed as Record<string, unknown>;
  const topKey = Object.keys(root).find(
    (k) => k !== "?xml" && k !== "@_version" && k !== "@_encoding",
  );
  const topNode = topKey ? (root[topKey] as Record<string, unknown>) : root;
  const itemsRaw = (topNode?.zajezd ??
    topNode?.tour ??
    topNode?.item ??
    topNode?.nabidka ??
    topNode?.offer) as unknown[] | undefined;

  if (!itemsRaw || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    return res.json({
      ok: false,
      message:
        "Could not locate tour items in the XML. Use /api/admin/alexandria/preview/json to inspect the structure and adjust the mapper.",
      raw: topKey ? { rootKey: topKey, keys: Object.keys(topNode ?? {}) } : null,
    });
  }

  const mapped = itemsRaw
    .map((item) => mapAlexandriaItem(item as Record<string, unknown>))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (dryRun) {
    return res.json({ ok: true, dryRun: true, count: mapped.length, items: mapped });
  }

  let created = 0;
  let updated = 0;

  for (const item of mapped) {
    const existing = item.externalId
      ? await prisma.tour.findFirst({
          where: {
            destination: item.destination,
            title: item.title,
            startDate: item.startDate,
          },
        })
      : null;

    const data = {
      destination: item.destination,
      title: item.title,
      price: item.price,
      startDate: item.startDate,
      endDate: item.endDate,
      transport: item.transport,
      image: item.image,
      description: item.description,
      photos: item.photos.length > 0 ? item.photos : undefined,
    };

    if (existing) {
      await prisma.tour.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.tour.create({
        data: { ...data, sortOrder: await prisma.tour.count() },
      });
      created++;
    }
  }

  return res.json({ ok: true, created, updated, total: mapped.length });
}));

export default router;
