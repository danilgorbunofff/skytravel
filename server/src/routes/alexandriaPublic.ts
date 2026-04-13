import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  fetchAlexandriaParsed,
  extractToursFromParsed,
  type AlexandriaTourInput,
} from "../lib/alexandria.js";

const router = Router();

// ── Shared in-memory cache (same TTL as admin route) ────────────────
const feedCacheMap = new Map<number, { data: AlexandriaTourInput[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const ALEXANDRIA_COUNTRY = Number(process.env.ALEXANDRIA_COUNTRY || 107);

async function getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
  const zeme = countryId ?? ALEXANDRIA_COUNTRY;
  const cached = feedCacheMap.get(zeme);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  const parsed = await fetchAlexandriaParsed(zeme);
  const mapped = extractToursFromParsed(parsed);
  feedCacheMap.set(zeme, { data: mapped, ts: Date.now() });
  return mapped;
}

function serializeItem(item: AlexandriaTourInput) {
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
  };
}

// ── GET /api/alexandria/last-minute ─────────────────────────────────
// Public endpoint for homepage last-minute offers.
// Returns the cheapest upcoming departures (default limit 8).
router.get(
  "/last-minute",
  asyncHandler(async (req, res) => {
    const countryId =
      req.query.zeme !== undefined ? Number(req.query.zeme) : undefined;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));

    const items = await getCachedFeed(countryId);

    const now = new Date();
    // Only future departures
    const upcoming = items.filter((t) => t.startDate > now);

    // Sort by price ascending (cheapest first = best last-minute deals)
    upcoming.sort((a, b) => a.price - b.price);

    const pageItems = upcoming.slice(0, limit);

    res.json({
      total: upcoming.length,
      items: pageItems.map(serializeItem),
    });
  }),
);

export default router;
