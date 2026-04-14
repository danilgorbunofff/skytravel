import { Router } from "express";
import type { Response } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  fetchTownState,
  fetchOrextravelTours,
  clearOrextravelCache,
  clearTourCache,
  type OrextravelTourInput,
} from "../../lib/orextravel.js";

const router = Router();

// ── Per-route in-memory cache for admin browsing ─────────────────────
const feedCacheMap = new Map<
  string,
  { data: OrextravelTourInput[]; ts: number }
>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

async function getCachedFeed(
  townFrom?: number,
  stateId?: number,
): Promise<OrextravelTourInput[]> {
  const key = `${townFrom ?? "all"}-${stateId ?? "all"}`;
  const cached = feedCacheMap.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchOrextravelTours(townFrom, stateId);
  feedCacheMap.set(key, { data, ts: Date.now() });
  return data;
}

/** Serialize a tour item for JSON response */
function serializeItem(item: OrextravelTourInput) {
  return {
    externalId: item.externalId,
    destination: item.destination,
    title: item.title,
    price: item.price,
    originalPrice: item.originalPrice,
    startDate: item.startDate.toISOString(),
    endDate: item.endDate.toISOString(),
    transport: item.transport,
    image: item.image,
    description: item.description,
    photos: item.photos,
    url: item.url,
    stars: item.stars,
    board: item.board,
    nights: item.nights,
    adults: item.adults,
    children: item.children,
    roomType: item.roomType,
  };
}

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── SSE stream — progressive tour loading ────────────────────────────
router.get(
  "/tours/stream",
  asyncHandler(async (req, res) => {
    const townFrom =
      req.query.townFrom !== undefined ? Number(req.query.townFrom) : undefined;
    const stateId =
      req.query.stateId !== undefined ? Number(req.query.stateId) : undefined;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    sendSSE(res, "start", { total: 0 });

    let loaded = 0;

    await fetchOrextravelTours(townFrom, stateId, ({ batch }) => {
      loaded += batch.length;
      sendSSE(res, "batch", {
        items: batch.map(serializeItem),
        progress: { loaded },
      });
    });

    // Also populate feedCacheMap so subsequent paginated calls are instant
    const items = await getCachedFeed(townFrom, stateId);
    sendSSE(res, "done", { total: items.length });
    res.end();
  }),
);

// ── Available routes (departure → destination) ───────────────────────
router.get(
  "/routes",
  asyncHandler(async (_req, res) => {
    const routes = await fetchTownState();
    res.json({ items: routes });
  }),
);

// ── Filtered tour browsing with pagination ───────────────────────────
router.get(
  "/tours",
  asyncHandler(async (req, res) => {
    const townFrom =
      req.query.townFrom !== undefined ? Number(req.query.townFrom) : undefined;
    const stateId =
      req.query.stateId !== undefined ? Number(req.query.stateId) : undefined;
    const q =
      typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
    const priceMin =
      req.query.priceMin !== undefined ? Number(req.query.priceMin) : undefined;
    const priceMax =
      req.query.priceMax !== undefined ? Number(req.query.priceMax) : undefined;
    const dateStart =
      typeof req.query.dateStart === "string"
        ? new Date(req.query.dateStart)
        : undefined;
    const dateEnd =
      typeof req.query.dateEnd === "string"
        ? new Date(req.query.dateEnd)
        : undefined;
    const refresh = req.query.refresh === "true";

    const sortBy =
      typeof req.query.sortBy === "string" ? req.query.sortBy : "price";
    const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    if (refresh) {
      const key = `${townFrom ?? "all"}-${stateId ?? "all"}`;
      feedCacheMap.delete(key);
      clearTourCache();
    }

    const items = await getCachedFeed(townFrom, stateId);

    let filtered = items;

    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.destination.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false) ||
          t.board.toLowerCase().includes(q) ||
          t.roomType.toLowerCase().includes(q),
      );
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

    // Server-side sort
    const sorted = [...filtered].sort((a, b) => {
      let d = 0;
      if (sortBy === "date") {
        d = a.startDate.getTime() - b.startDate.getTime();
      } else {
        d = a.price - b.price;
      }
      return sortDir === "asc" ? d : -d;
    });

    const uniqueDestinations = new Set(sorted.map((t) => t.destination)).size;
    const uniqueHotels = new Set(sorted.map((t) => t.title)).size;

    // Paginate
    const totalPages = Math.ceil(sorted.length / limit);
    const start = (page - 1) * limit;
    const pageItems = sorted.slice(start, start + limit);

    res.json({
      total: items.length,
      filtered: sorted.length,
      uniqueDestinations,
      uniqueHotels,
      page,
      limit,
      totalPages,
      items: pageItems.map(serializeItem),
    });
  }),
);

// ── Import tours into DB ─────────────────────────────────────────────
router.post(
  "/import",
  asyncHandler(async (req, res) => {
    const townFrom =
      req.body?.townFrom !== undefined ? Number(req.body.townFrom) : undefined;
    const stateId =
      req.body?.stateId !== undefined ? Number(req.body.stateId) : undefined;
    const dryRun = Boolean(req.body?.dryRun);
    const selectedIds: string[] | undefined = req.body?.ids;

    const items = await getCachedFeed(townFrom, stateId);

    if (items.length === 0) {
      return res.json({
        ok: false,
        message:
          "No tours found. Check if the API is reachable and the token is valid.",
      });
    }

    const toImport =
      selectedIds && Array.isArray(selectedIds)
        ? items.filter((item) => selectedIds.includes(item.externalId))
        : items;

    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        count: toImport.length,
        items: toImport.map(serializeItem),
      });
    }

    let created = 0;
    let updated = 0;

    for (const item of toImport) {
      const existing = await prisma.tour.findFirst({
        where: {
          source: "orextravel",
          externalId: item.externalId,
        },
      });

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
        source: "orextravel" as const,
        externalId: item.externalId,
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
  }),
);

// ── Clear cache ──────────────────────────────────────────────────────
router.post("/refresh", (_req, res) => {
  feedCacheMap.clear();
  clearOrextravelCache();
  res.json({ ok: true, message: "Cache cleared" });
});

export default router;
