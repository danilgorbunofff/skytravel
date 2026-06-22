import { Router } from "express";
import { LRUCache } from "lru-cache";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  fetchAlexandriaParsed,
  extractToursFromParsed,
  type AlexandriaTourInput,
} from "../lib/alexandria.js";
import { isPlausibleProviderPriceCzk } from "../lib/providerPrice.js";
import { config } from "../config.js";

const router = Router();

// ── Shared in-memory LRU cache (same TTL as admin route) ────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const feedCache = new LRUCache<number, { data: AlexandriaTourInput[]; ts: number }>({
  max: 10,          // max 10 countries cached
  ttl: CACHE_TTL,   // auto-expire entries after TTL
});
const ALEXANDRIA_COUNTRY = config.alexandria.country;

async function getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
  const zeme = countryId ?? ALEXANDRIA_COUNTRY;
  const cached = feedCache.get(zeme);
  if (cached) return cached.data;
  const parsed = await fetchAlexandriaParsed(zeme);
  const mapped = extractToursFromParsed(parsed);
  feedCache.set(zeme, { data: mapped, ts: Date.now() });
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
    const countryId = req.query.zeme !== undefined ? Number(req.query.zeme) : undefined;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));

    const items = await getCachedFeed(countryId);

    const now = new Date();
    // Only future departures with plausible prices
    const upcoming = items.filter((t) => t.startDate > now && isPlausibleProviderPriceCzk(t.price));

    // Sort by price ascending (cheapest first = best last-minute deals)
    upcoming.sort((a, b) => a.price - b.price);

    // Deduplicate by title (hotel name) — keep cheapest per hotel
    const seen = new Set<string>();
    const deduped: typeof upcoming = [];
    for (const item of upcoming) {
      if (!seen.has(item.title)) {
        seen.add(item.title);
        deduped.push(item);
      }
    }

    const pageItems = deduped.slice(0, limit);

    res.json({
      total: upcoming.length,
      items: pageItems.map(serializeItem),
    });
  }),
);

export default router;
