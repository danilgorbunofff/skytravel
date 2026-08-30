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
  max: 10, // max 10 countries cached
  ttl: CACHE_TTL, // auto-expire entries after TTL
});
// Negative cache: remember upstream failures briefly so an outage does not
// turn every page view into a slow doomed fetch.
const NEGATIVE_CACHE_TTL = 60 * 1000; // 60s
const negativeCache = new LRUCache<number, { err: Error; ts: number }>({
  max: 10,
  ttl: NEGATIVE_CACHE_TTL,
});
const ALEXANDRIA_COUNTRY = config.alexandria.country;

async function getDbFallback(limit: number, boardFilter: Set<string> | null) {
  try {
    const { default: prisma } = await import("../prisma.js");
    const now = new Date();
    const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.providerTour.findMany({
      where: {
        source: "alexandria",
        startDate: { gt: now, lt: cutoff },
      },
      orderBy: [{ stars: "desc" }, { price: "asc" }],
      take: 200,
    });
    const items = rows.map(
      (r: {
        externalId: string;
        destination: string;
        title: string;
        price: number;
        originalPrice: number;
        startDate: Date;
        endDate: Date;
        transport: string;
        image: string;
        description: string | null;
        photos: unknown;
        url: string;
        stars: string;
        board: string;
      }) => ({
        externalId: r.externalId,
        destination: r.destination,
        title: r.title,
        price: r.price,
        originalPrice: r.originalPrice,
        startDate: r.startDate,
        endDate: r.endDate,
        transport: r.transport,
        image: r.image,
        description: r.description,
        photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
        url: r.url,
        stars: r.stars,
        board: r.board,
      }),
    );
    // Apply the board filter BEFORE dedup so a hotel whose best row has a
    // different board does not shadow a board-matching row of the same title.
    const boardMatching = boardFilter
      ? items.filter((it) => boardFilter.has((it.board ?? "").toUpperCase()))
      : items;
    const seen = new Set<string>();
    const deduped: typeof items = [];
    for (const it of boardMatching) {
      if (!seen.has(it.title)) {
        seen.add(it.title);
        deduped.push(it);
      }
    }
    return { total: deduped.length, items: deduped.slice(0, limit).map(serializeItem) };
  } catch {
    return null;
  }
}

async function getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
  const zeme = countryId ?? ALEXANDRIA_COUNTRY;
  const cached = feedCache.get(zeme);
  if (cached) return cached.data;
  const failed = negativeCache.get(zeme);
  if (failed) throw failed.err;
  try {
    const parsed = await fetchAlexandriaParsed(zeme);
    const mapped = extractToursFromParsed(parsed);
    feedCache.set(zeme, { data: mapped, ts: Date.now() });
    return mapped;
  } catch (err) {
    // Cache the failure briefly so an upstream outage doesn't turn every
    // page view into a slow doomed fetch.
    negativeCache.set(zeme, {
      err: err instanceof Error ? err : new Error(String(err)),
      ts: Date.now(),
    });
    throw err;
  }
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

    // Optional board filter (comma-separated, case-insensitive)
    const boardParam = (req.query.board as string | undefined)?.trim();
    const boardFilter = boardParam
      ? new Set(
          boardParam
            .split(",")
            .map((b) => b.trim().toUpperCase())
            .filter(Boolean),
        )
      : null;

    let items: AlexandriaTourInput[];
    try {
      items = await getCachedFeed(countryId);
    } catch {
      const fb = await getDbFallback(limit, boardFilter);
      if (fb) {
        res.json(fb);
        return;
      }
      throw new Error("Alexandria upstream unavailable and no local fallback data.");
    }

    const now = new Date();
    // Only departures starting within the next 7 days with plausible prices
    const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = items.filter(
      (t) => t.startDate > now && t.startDate < cutoff && isPlausibleProviderPriceCzk(t.price),
    );

    // Board priority: UAI = 0, AI = 1, rest = 2
    function boardPriority(board: string | undefined): number {
      const b = (board ?? "").toUpperCase();
      if (b === "UAI") return 0;
      if (b === "AI") return 1;
      return 2;
    }

    // Sort: highest stars → best board → cheapest price
    upcoming.sort((a, b) => {
      const starsA = Number(a.stars) || 0;
      const starsB = Number(b.stars) || 0;
      if (starsB !== starsA) return starsB - starsA;
      const boardDiff = boardPriority(a.board) - boardPriority(b.board);
      if (boardDiff !== 0) return boardDiff;
      return a.price - b.price;
    });

    // Deduplicate by title (hotel name) — keep first (best by sort order).
    // Board filter runs BEFORE dedup: dedup keeps only the best row per
    // hotel, so filtering after dedup drops hotels whose best row has a
    // different board even when a matching row exists.
    const boardMatching = boardFilter
      ? upcoming.filter((it) => boardFilter.has((it.board ?? "").toUpperCase()))
      : upcoming;
    const seen = new Set<string>();
    const deduped: typeof upcoming = [];
    for (const item of boardMatching) {
      if (!seen.has(item.title)) {
        seen.add(item.title);
        deduped.push(item);
      }
    }

    const filtered = deduped;

    const pageItems = filtered.slice(0, limit);
    if (pageItems.length === 0) {
      const fb = await getDbFallback(limit, boardFilter);
      if (fb && fb.items.length > 0) {
        res.json(fb);
        return;
      }
    }

    res.json({
      total: filtered.length,
      items: pageItems.map(serializeItem),
    });
  }),
);

export default router;
