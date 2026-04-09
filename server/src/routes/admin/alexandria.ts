import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  fetchAlexandriaRaw,
  fetchAlexandriaParsed,
  mapAlexandriaItem,
  type AlexandriaTourInput,
} from "../../lib/alexandria.js";

const router = Router();

// ── Simple in-memory cache so the dashboard doesn't hammer Alexandria ──
let feedCache: { data: AlexandriaTourInput[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
  if (feedCache && Date.now() - feedCache.ts < CACHE_TTL && countryId === undefined) {
    return feedCache.data;
  }

  const parsed = await fetchAlexandriaParsed(countryId);
  const root = parsed as Record<string, unknown>;
  const topKey = Object.keys(root).find(
    (k) => k !== "?xml" && k !== "@_version" && k !== "@_encoding",
  );
  const topNode = topKey ? (root[topKey] as Record<string, unknown>) : root;

  // Try every plausible root element name
  let itemsRaw = (topNode?.zajezd ??
    topNode?.tour ??
    topNode?.item ??
    topNode?.nabidka ??
    topNode?.offer) as unknown[] | undefined;

  // If none matched, look one level deeper in every child
  if (!itemsRaw || !Array.isArray(itemsRaw)) {
    for (const val of Object.values(topNode ?? {})) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const inner = val as Record<string, unknown>;
        const candidate = inner.zajezd ?? inner.tour ?? inner.item ?? inner.nabidka ?? inner.offer;
        if (Array.isArray(candidate)) {
          itemsRaw = candidate as unknown[];
          break;
        }
      }
    }
  }

  if (!itemsRaw || !Array.isArray(itemsRaw)) return [];

  const mapped = itemsRaw
    .map((item) => mapAlexandriaItem(item as Record<string, unknown>))
    .filter((item): item is AlexandriaTourInput => item !== null);

  if (countryId === undefined) {
    feedCache = { data: mapped, ts: Date.now() };
  }

  return mapped;
}

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
  const selectedIds: string[] | undefined = req.body?.ids;

  const items = await getCachedFeed(countryId);

  if (items.length === 0) {
    return res.json({
      ok: false,
      message:
        "Could not locate tour items in the XML. Use /api/admin/alexandria/preview/json to inspect the structure.",
    });
  }

  const toImport = selectedIds && Array.isArray(selectedIds)
    ? items.filter((item) => selectedIds.includes(item.externalId))
    : items;

  if (dryRun) {
    return res.json({ ok: true, dryRun: true, count: toImport.length, items: toImport });
  }

  let created = 0;
  let updated = 0;

  for (const item of toImport) {
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

  return res.json({ ok: true, created, updated, total: toImport.length });
}));

// ── Filtered feed browsing ───────────────────────────────────────────
router.get("/tours", asyncHandler(async (req, res) => {
  const countryId = req.query.zeme !== undefined ? Number(req.query.zeme) : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
  const transport = typeof req.query.transport === "string" ? req.query.transport : "";
  const priceMin = req.query.priceMin !== undefined ? Number(req.query.priceMin) : undefined;
  const priceMax = req.query.priceMax !== undefined ? Number(req.query.priceMax) : undefined;
  const dateStart = typeof req.query.dateStart === "string" ? new Date(req.query.dateStart) : undefined;
  const dateEnd = typeof req.query.dateEnd === "string" ? new Date(req.query.dateEnd) : undefined;
  const refresh = req.query.refresh === "true";

  if (refresh) feedCache = null;

  const items = await getCachedFeed(countryId);

  let filtered = items;

  if (q) {
    filtered = filtered.filter(
      (t) =>
        t.destination.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false),
    );
  }

  if (transport) {
    filtered = filtered.filter((t) => t.transport === transport);
  }

  if (priceMin !== undefined && Number.isFinite(priceMin)) {
    filtered = filtered.filter((t) => t.price >= priceMin);
  }

  if (priceMax !== undefined && Number.isFinite(priceMax)) {
    filtered = filtered.filter((t) => t.price <= priceMax);
  }

  if (dateStart && !Number.isNaN(dateStart.getTime())) {
    filtered = filtered.filter((t) => t.startDate >= dateStart);
  }

  if (dateEnd && !Number.isNaN(dateEnd.getTime())) {
    filtered = filtered.filter((t) => t.endDate <= dateEnd);
  }

  res.json({
    total: items.length,
    filtered: filtered.length,
    items: filtered,
  });
}));

// ── Clear cache ──────────────────────────────────────────────────────
router.post("/refresh", (_req, res) => {
  feedCache = null;
  res.json({ ok: true, message: "Cache cleared" });
});

export default router;
