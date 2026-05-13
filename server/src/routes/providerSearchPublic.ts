import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAllProviders, getProvider } from "../providers/index.js";
import type { FilterFieldDescriptor, UnifiedFilters } from "../providers/types.js";

const router = Router();

// ── In-memory result cache ────────────────────────────────────────────
// Keyed by "providerId:/full/url?with=params". TTL 30 s, max 500 entries.
const resultCache = new Map<string, { data: unknown; ts: number }>();
const RESULT_CACHE_TTL = 30_000;
const RESULT_CACHE_MAX = 500;

function getCachedResult(key: string): unknown | null {
  const entry = resultCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > RESULT_CACHE_TTL) {
    resultCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResult(key: string, data: unknown): void {
  if (resultCache.size >= RESULT_CACHE_MAX) {
    const oldest = resultCache.keys().next().value;
    if (oldest) resultCache.delete(oldest);
  }
  resultCache.set(key, { data, ts: Date.now() });
}

const SHARED_KEYS = new Set([
  "q",
  "priceMin",
  "priceMax",
  "dateStart",
  "dateEnd",
  "sortBy",
  "sortDir",
  "page",
  "limit",
  "offerGroupKey",
]);

const MAX_QUERY_LENGTH = 120;
const MAX_PUBLIC_LIMIT = 60;
const MAX_PRICE = 2_000_000;

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  if (typeof value !== "string") return undefined;
  return value.trim();
}

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

function validateProviderFilters(
  req: Request,
  res: Response,
  fields: FilterFieldDescriptor[],
): Record<string, unknown> | undefined {
  const allowed = new Map(fields.map((field) => [field.key, field]));
  const providerFilters: Record<string, unknown> = {};

  for (const key of Object.keys(req.query)) {
    if (SHARED_KEYS.has(key)) continue;
    const field = allowed.get(key);
    if (!field) {
      res.status(400).json({ error: `Unsupported filter: ${key}.` });
      return undefined;
    }

    const raw = firstQueryValue(req.query[key]);
    if (!raw) continue;
    if (raw.length > MAX_QUERY_LENGTH) {
      res.status(400).json({ error: `${key} is too long.` });
      return undefined;
    }

    if (field.type === "number") {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        res.status(400).json({ error: `${key} must be a number.` });
        return undefined;
      }
      providerFilters[key] = numeric;
      continue;
    }

    if (field.options && field.options.length > 0) {
      const valid = field.options.some((option) => String(option.value) === raw);
      if (!valid) {
        res.status(400).json({ error: `${key} has an unsupported value.` });
        return undefined;
      }
    }

    providerFilters[key] = raw;
  }

  return providerFilters;
}

function buildFilters(req: Request, res: Response, fields: FilterFieldDescriptor[]): UnifiedFilters | undefined {
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
  const limit = parseOptionalNumber(req, res, "limit", { integer: true, min: 1, max: MAX_PUBLIC_LIMIT }) ?? 24;
  if (res.headersSent) return undefined;

  const providerFilters = validateProviderFilters(req, res, fields);
  if (!providerFilters || res.headersSent) return undefined;

  return {
    q,
    priceMin,
    priceMax,
    dateStart,
    dateEnd,
    sortBy,
    sortDir: sortDir as "asc" | "desc",
    page,
    limit,
    providerFilters,
  };
}

router.get(
  "/providers",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ providers: getAllProviders() });
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
          console.warn(`[PublicSearch] bootstrap regions failed for ${meta.id}:`, err);
          return [meta.id, []] as const;
        }
      }),
    );
    const regionsByProvider: Record<string, readonly unknown[]> = {};
    for (const [id, items] of entries) regionsByProvider[id] = items;

    // Version derived from the most recent ProviderSync.lastSyncAt across
    // all providers. Used as an ETag so the browser returns 304 until the
    // server-side cache actually changes.
    const versionParts = providers
      .map((p) => p.cacheStatus?.lastRefresh ?? 0)
      .join(":");
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
  "/providers/:id/regions",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      try {
        const items = await provider.getRegions();
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        res.json({ items });
      } catch (err) {
        console.warn(`[PublicSearch] Failed to load regions for ${req.params.id}:`, err);
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

      const cacheKey = `${req.params.id}:offer-group:${req.url}`;
      const cached = getCachedResult(cacheKey);
      if (cached) {
        res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.setHeader("X-Cache", "HIT");
        res.json(cached);
        return;
      }

      const result = { items: await provider.fetchOfferGroup(filters, offerGroupKey) };
      setCachedResult(cacheKey, result);
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("X-Cache", "MISS");
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

      const cacheKey = `${req.params.id}:${req.url}`;
      const cached = getCachedResult(cacheKey);
      if (cached) {
        res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.setHeader("X-Cache", "HIT");
        res.json(cached);
        return;
      }

      const result = await provider.fetchTours({ ...filters, groupResults: true });
      setCachedResult(cacheKey, result);
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.setHeader("X-Cache", "MISS");
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

export default router;