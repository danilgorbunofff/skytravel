import type { Request, Response } from "express";
import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAllProviders, getProvider } from "../providers/index.js";
import { getOrFetchPublicSearchResult } from "../providers/publicSearchCache.js";
import {
  getDestinationSearchContext,
  listPublicDestinations,
} from "../providers/destinationStore.js";
import type {
  FilterFieldDescriptor,
  ToursResult,
  UnifiedFilters,
  UnifiedTour,
} from "../providers/types.js";
import { validateProviderFilters } from "../lib/validateProviderFilters.js";
import { firstQueryValue } from "../providers/shared/queryUtils.js";
import { logger } from "../lib/logger.js";

const router = Router();

const MAX_QUERY_LENGTH = 120;
const MAX_PUBLIC_LIMIT = 60;
const MAX_PRICE = 2_000_000;

function parseOptionalNumber(
  req: Request,
  res: Response,
  key: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
): number | undefined {
  const raw = firstQueryValue(req.query[key]);
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    res.status(400).json({ error: `${key} must be a number.` });
    return undefined;
  }
  if (options.integer && !Number.isInteger(value)) {
    res.status(400).json({ error: `${key} must be a whole number.` });
    return undefined;
  }
  if (options.min !== undefined && value < options.min) {
    res.status(400).json({ error: `${key} must be at least ${options.min}.` });
    return undefined;
  }
  if (options.max !== undefined && value > options.max) {
    res.status(400).json({ error: `${key} must be at most ${options.max}.` });
    return undefined;
  }
  return value;
}

function parseOptionalDate(req: Request, res: Response, key: string): string | undefined {
  const raw = firstQueryValue(req.query[key]);
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    res.status(400).json({ error: `${key} must be in YYYY-MM-DD format.` });
    return undefined;
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    res.status(400).json({ error: `${key} is not a valid date.` });
    return undefined;
  }
  return raw;
}

function buildFilters(
  req: Request,
  res: Response,
  fields: FilterFieldDescriptor[],
): UnifiedFilters | undefined {
  const q = firstQueryValue(req.query.q);
  if (q && q.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ error: "Search query is too long." });
    return undefined;
  }

  const priceMin = parseOptionalNumber(req, res, "priceMin", { min: 0, max: MAX_PRICE });
  if (res.headersSent) return undefined;
  const priceMax = parseOptionalNumber(req, res, "priceMax", { min: 0, max: MAX_PRICE });
  if (res.headersSent) return undefined;
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    res.status(400).json({ error: "priceMin cannot be greater than priceMax." });
    return undefined;
  }

  const dateStart = parseOptionalDate(req, res, "dateStart");
  if (res.headersSent) return undefined;
  const dateEnd = parseOptionalDate(req, res, "dateEnd");
  if (res.headersSent) return undefined;
  if (dateStart && dateEnd && dateStart > dateEnd) {
    res.status(400).json({ error: "dateStart cannot be after dateEnd." });
    return undefined;
  }

  const nights = firstQueryValue(req.query.nights);
  if (nights && !/^\d{1,3}-\d{1,3}$/.test(nights)) {
    res.status(400).json({ error: "nights must be a range like 7-13." });
    return undefined;
  }

  const stars = firstQueryValue(req.query.stars);
  if (stars && !/^[1-5]$/.test(stars)) {
    res.status(400).json({ error: "stars must be between 1 and 5." });
    return undefined;
  }

  const board = firstQueryValue(req.query.board);
  // Support comma-separated board values for multi-select (e.g. "AI,UAI")
  if (board) {
    const boardValues = board.split(",");
    if (boardValues.some((v) => v.length > 16 || !/^[A-Za-z0-9_-]+$/.test(v))) {
      res.status(400).json({ error: "board has an unsupported value." });
      return undefined;
    }
  }

  const adults = parseOptionalNumber(req, res, "adults", { integer: true, min: 1, max: 9 });
  if (res.headersSent) return undefined;
  const children = parseOptionalNumber(req, res, "children", { integer: true, min: 0, max: 6 });
  if (res.headersSent) return undefined;

  const sortBy = firstQueryValue(req.query.sortBy) || "price";
  if (!["price", "date"].includes(sortBy)) {
    res.status(400).json({ error: "sortBy must be price or date." });
    return undefined;
  }

  const sortDir = firstQueryValue(req.query.sortDir) || "asc";
  if (!["asc", "desc"].includes(sortDir)) {
    res.status(400).json({ error: "sortDir must be asc or desc." });
    return undefined;
  }

  const page = parseOptionalNumber(req, res, "page", { integer: true, min: 1, max: 10_000 }) ?? 1;
  if (res.headersSent) return undefined;
  const limit =
    parseOptionalNumber(req, res, "limit", { integer: true, min: 1, max: MAX_PUBLIC_LIMIT }) ?? 24;
  if (res.headersSent) return undefined;

  const providerFilters = validateProviderFilters(req, res, fields);
  if (!providerFilters || res.headersSent) return undefined;

  return {
    q,
    priceMin,
    priceMax,
    dateStart,
    dateEnd,
    nights,
    stars,
    board,
    adults,
    children,
    sortBy,
    sortDir: sortDir as "asc" | "desc",
    page,
    limit,
    providerFilters,
  };
}

function sortTours(
  items: UnifiedTour[],
  sortBy: string | undefined,
  sortDir: "asc" | "desc" | undefined,
): UnifiedTour[] {
  const dir = sortDir === "desc" ? -1 : 1;
  return [...items].sort((left, right) => {
    const leftValue = sortBy === "date" ? new Date(left.startDate).getTime() : left.price;
    const rightValue = sortBy === "date" ? new Date(right.startDate).getTime() : right.price;
    if (leftValue !== rightValue) return (leftValue - rightValue) * dir;
    return `${left.source}:${left.externalId}`.localeCompare(`${right.source}:${right.externalId}`);
  });
}

function sumOptional(values: Array<number | undefined>): number | undefined {
  const filtered = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  return filtered.length > 0 ? filtered.reduce((sum, value) => sum + value, 0) : undefined;
}

router.get(
  "/providers",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ providers: getAllProviders() });
  }),
);

router.get(
  "/all/tours",
  asyncHandler(async (req: Request, res: Response) => {
    const filters = buildFilters(req, res, []);
    if (!filters) return;

    const destinationSlug = firstQueryValue(req.query.destinationSlug);
    // Support comma-separated destination slugs for multi-select
    const destinationSlugs = destinationSlug ? destinationSlug.split(",").filter(Boolean) : [];
    if (destinationSlugs.some((s) => !/^[a-z0-9-]{1,120}$/.test(s))) {
      res.status(400).json({ error: "destinationSlug has an unsupported value." });
      return;
    }

    const transport = firstQueryValue(req.query.transport);
    if (transport && !/^[A-Za-z0-9_-]{1,24}$/.test(transport)) {
      res.status(400).json({ error: "transport has an unsupported value." });
      return;
    }

    // hotelOnly=1 includes hotel-only (car) tours; otherwise exclude them by default
    const hotelOnly = firstQueryValue(req.query.hotelOnly) === "1";

    const destinationContext = destinationSlugs.length === 1
      ? await getDestinationSearchContext(destinationSlugs[0])
      : null;
    // For multi-destination, resolve all contexts
    const multiDestinationContexts = destinationSlugs.length > 1
      ? (await Promise.all(destinationSlugs.map((s) => getDestinationSearchContext(s)))).filter(Boolean)
      : [];
    if (destinationSlugs.length === 1 && !destinationContext) {
      const emptyResult = {
        total: 0,
        filtered: 0,
        uniqueDestinations: 0,
        page: filters.page ?? 1,
        limit: filters.limit ?? 24,
        totalPages: 1,
        items: [],
        degraded: false,
        providerErrors: [],
        providers: [],
      };
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.json(emptyResult);
      return;
    }
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(MAX_PUBLIC_LIMIT, Math.max(1, filters.limit ?? 24));
    const perProviderLimit = Math.min(1_000, page * limit);
    const providers = getAllProviders();
    // Normalize key: sort params alphabetically so different orderings of the
    // same filters share one cache slot (and one single-flight refresh).
    const sortedParams = new URLSearchParams(req.query as Record<string, string>);
    sortedParams.sort();
    const cacheKey = `all:tours:${sortedParams.toString()}`;

    const { data: result, cache: cacheStatus } = await getOrFetchPublicSearchResult(
      cacheKey,
      async () => {
        const settled = await Promise.allSettled(
          providers.map(async (meta) => {
            const provider = getProvider(meta.id);
            const providerFilters: Record<string, unknown> = {};
            if (transport) providerFilters.transport = transport;
            else if (!hotelOnly) providerFilters.excludeTransport = "car";

            // Single destination
            const mapping = destinationContext?.mappings.find(
              (item) => item.providerId === meta.id,
            );
            if (mapping) providerFilters[mapping.providerKey] = mapping.providerValue;

            // Multi-destination: collect all mappings for this provider
            if (multiDestinationContexts.length > 0) {
              const mappings = multiDestinationContexts
                .flatMap((ctx) => ctx?.mappings.find((m) => m.providerId === meta.id) ?? [])
                .filter(Boolean);
              if (mappings.length > 0) {
                // Use array of values for OR logic (provider must support this)
                providerFilters[mappings[0].providerKey] = mappings.map((m) => m.providerValue);
              }
            }

            const fallbackQuery = destinationContext?.destination.czechName
              ?? (multiDestinationContexts.length > 0
                ? multiDestinationContexts
                    .filter((ctx) => ctx != null)
                    .map((ctx) => ctx.destination.czechName)
                    .join("|")
                : undefined);

            const providerQuery: UnifiedFilters = {
              ...filters,
              q: mapping ? filters.q : (filters.q ?? fallbackQuery),
              page: 1,
              limit: perProviderLimit,
              providerFilters,
              groupResults: true,
              omitHeavy: true,
            };
            const result = await provider.fetchTours(providerQuery);
            return { meta, result };
          }),
        );

        const providerErrors: Array<{ providerId: string; message: string }> = [];
        const successful: Array<{ meta: { id: string; label: string }; result: ToursResult }> = [];
        for (let index = 0; index < settled.length; index += 1) {
          const item = settled[index];
          const meta = providers[index];
          if (item.status === "fulfilled") {
            successful.push(item.value);
          } else {
            const message =
              item.reason instanceof Error ? item.reason.message : String(item.reason);
            providerErrors.push({ providerId: meta.id, message });
            logger.warn({ err: item.reason }, `[PublicSearch] all-provider search failed for ${meta.id}`);
          }
        }

        const mergedItems = sortTours(
          successful.flatMap(({ result }) => result.items),
          filters.sortBy,
          filters.sortDir,
        );
        const filtered = successful.reduce((sum, { result }) => sum + result.filtered, 0);
        const total = successful.reduce((sum, { result }) => sum + result.total, 0);
        const start = (page - 1) * limit;
        const items = mergedItems.slice(start, start + limit);
        return {
          total,
          filtered,
          rawTotalOffers: sumOptional(successful.map(({ result }) => result.rawTotalOffers)),
          rawFilteredOffers: sumOptional(successful.map(({ result }) => result.rawFilteredOffers)),
          uniqueDestinations: new Set(
            mergedItems.map((tour) => tour.destination.toLocaleLowerCase("cs-CZ")),
          ).size,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(filtered / limit)),
          items,
          degraded: providerErrors.length > 0,
          providerErrors,
          providers: successful.map(({ meta, result }) => ({
            id: meta.id,
            label: meta.label,
            filtered: result.filtered,
          })),
        };
      },
    );

    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.setHeader("X-Cache", cacheStatus.toUpperCase());
    res.json(result);
  }),
);

// ── Bootstrap: providers + all regions in a single response ──────────
// Reduces SearchPage init from 1+N HTTP round-trips (providers + regions
// per provider) to a single round-trip that the browser can ETag-cache.
router.get(
  "/bootstrap",
  asyncHandler(async (req: Request, res: Response) => {
    const providers = getAllProviders();
    const entries = await Promise.all(
      providers.map(async (meta) => {
        try {
          const provider = getProvider(meta.id);
          const items = await provider.getRegions();
          return [meta.id, items] as const;
        } catch (err) {
          logger.warn({ err }, `[PublicSearch] bootstrap regions failed for ${meta.id}`);
          return [meta.id, []] as const;
        }
      }),
    );
    const regionsByProvider: Record<string, readonly unknown[]> = {};
    for (const [id, items] of entries) regionsByProvider[id] = items;

    // Version derived from the most recent ProviderSync.lastSyncAt across
    // all providers. Used as an ETag so the browser returns 304 until the
    // server-side cache actually changes.
    const versionParts = providers.map((p) => p.cacheStatus?.lastRefresh ?? 0).join(":");
    const etag = `W/"bootstrap-${Buffer.from(versionParts).toString("base64").slice(0, 24)}"`;

    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ providers, regionsByProvider, version: etag });
  }),
);

router.get(
  "/destinations",
  asyncHandler(async (req: Request, res: Response) => {
    const providerId = firstQueryValue(req.query.providerId);
    if (providerId && providerId.length > MAX_QUERY_LENGTH) {
      res.status(400).json({ error: "providerId is too long." });
      return;
    }

    // ETag derived from the latest sync timestamp(s) — browser/SWR clients
    // can issue If-None-Match and skip the JSON body until data changes.
    const versionParts = getAllProviders()
      .filter((p) => !providerId || p.id === providerId)
      .map((p) => `${p.id}:${p.cacheStatus?.lastRefresh ?? 0}`)
      .join("|");
    const etag = `W/"destinations-${Buffer.from(versionParts).toString("base64").slice(0, 24)}"`;

    if (req.headers["if-none-match"] === etag) {
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.status(304).end();
      return;
    }

    const cacheKey = `destinations:${providerId ?? "all"}`;
    const { data: result, cache: cacheStatus } = await getOrFetchPublicSearchResult(
      cacheKey,
      async () => ({ items: await listPublicDestinations(providerId) }),
    );
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.setHeader("X-Cache", cacheStatus.toUpperCase());
    res.json(result);
  }),
);

router.get(
  "/providers/:id/regions",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      try {
        const hasFilterParams = Object.keys(req.query).length > 0;
        let filters: UnifiedFilters | undefined;
        if (hasFilterParams) {
          filters = buildFilters(req, res, provider.getProviderFilters());
          if (!filters) return;
          const providerFilters = { ...filters.providerFilters };
          delete providerFilters.zeme;
          delete providerFilters.stateId;
          filters = {
            ...filters,
            page: 1,
            providerFilters,
          };
        }

        const items = await provider.getRegions(filters);
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        res.json({ items });
      } catch (err) {
        logger.warn({ err }, `[PublicSearch] Failed to load regions for ${req.params.id}`);
        res.json({ items: [], degraded: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

router.get(
  "/providers/:id/offer-group",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      const offerGroupKey = firstQueryValue(req.query.offerGroupKey);
      if (!offerGroupKey) {
        res.status(400).json({ error: "offerGroupKey is required." });
        return;
      }
      if (offerGroupKey.length > 500) {
        res.status(400).json({ error: "offerGroupKey is too long." });
        return;
      }

      const filters = buildFilters(req, res, provider.getProviderFilters());
      if (!filters) return;

      const sortedParams = new URLSearchParams(req.query as Record<string, string>);
      sortedParams.sort();
      const cacheKey = `${req.params.id}:offer-group:${offerGroupKey}:${sortedParams.toString()}`;
      const { data: result, cache: cacheStatus } = await getOrFetchPublicSearchResult(
        cacheKey,
        async () => ({ items: await provider.fetchOfferGroup(filters, offerGroupKey) }),
      );
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("X-Cache", cacheStatus.toUpperCase());
      res.json(result);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

router.get(
  "/providers/:id/tours",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      const filters = buildFilters(req, res, provider.getProviderFilters());
      if (!filters) return;

      const sortedParams = new URLSearchParams(req.query as Record<string, string>);
      sortedParams.sort();
      const cacheKey = `${req.params.id}:tours:${sortedParams.toString()}`;
      const { data: result, cache: cacheStatus } = await getOrFetchPublicSearchResult(
        cacheKey,
        async () => provider.fetchTours({ ...filters, groupResults: true, omitHeavy: true }),
      );
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("X-Cache", cacheStatus.toUpperCase());
      res.json(result);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

/**
 * GET /api/search/tour/:providerId/:externalId
 * Fetch a single tour by provider + externalId (for deep linking).
 */
router.get(
  "/tour/:providerId/:externalId",
  asyncHandler(async (req: Request, res: Response) => {
    const { providerId, externalId } = req.params;
    const provider = getProvider(providerId);
    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    // Search with minimal filters and look for the specific externalId
    const filters: UnifiedFilters = {
      q: externalId,
      providerFilters: {},
      page: 1,
      limit: 100,
      sortBy: "price",
      sortDir: "asc",
    };
    const result: ToursResult = await provider.fetchTours(filters);
    const tour = result.items.find((t: UnifiedTour) => t.externalId === externalId);

    if (!tour) {
      res.status(404).json({ error: "Tour not found" });
      return;
    }

    res.json({ tour });
  }),
);

export default router;
