import type { Request, Response } from "express";
import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { importToursSchema } from "../../validators/providers.js";
import { getProvider, getAllProviders } from "../../providers/index.js";
import { success, fail } from "../../lib/response.js";
import type { UnifiedFilters } from "../../providers/types.js";

const router = Router();

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
  "refresh",
]);

// ── GET / — list all providers ────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = getAllProviders();
    success(res, { providers });
  }),
);

// ── GET /bootstrap — providers + all regions in a single response ────
router.get(
  "/bootstrap",
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = getAllProviders();
    const entries = await Promise.all(
      providers.map(async (meta) => {
        try {
          const provider = getProvider(meta.id);
          const items = await provider.getRegions();
          return [meta.id, items] as const;
        } catch (err) {
          console.warn(`[AdminProviders] bootstrap regions failed for ${meta.id}:`, err);
          return [meta.id, []] as const;
        }
      }),
    );
    const regionsByProvider: Record<string, readonly unknown[]> = {};
    for (const [id, items] of entries) regionsByProvider[id] = items;
    success(res, { providers, regionsByProvider });
  }),
);

// ── GET /:id/regions ──────────────────────────────────────────────────
router.get(
  "/:id/regions",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      const items = await provider.getRegions();
      success(res, { items });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        fail("NOT_FOUND", err.message, 404);
      }
      throw err;
    }
  }),
);

// ── GET /:id/cache-status ─────────────────────────────────────────────
router.get(
  "/:id/cache-status",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      const status = provider.getCacheStatus();
      success(res, status);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        fail("NOT_FOUND", err.message, 404);
      }
      throw err;
    }
  }),
);

// ── GET /:id/tours ────────────────────────────────────────────────────
router.get(
  "/:id/tours",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);

      const providerFilters: Record<string, unknown> = {};
      for (const key of Object.keys(req.query)) {
        if (!SHARED_KEYS.has(key)) {
          providerFilters[key] = req.query[key];
        }
      }

      const filters: UnifiedFilters = {
        q: req.query.q as string | undefined,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        dateStart: req.query.dateStart as string | undefined,
        dateEnd: req.query.dateEnd as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortDir: req.query.sortDir as "asc" | "desc" | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        refresh: req.query.refresh === "true",
        providerFilters,
      };

      const result = await provider.fetchTours(filters);
      success(res, result);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        fail("NOT_FOUND", err.message, 404);
      }
      throw err;
    }
  }),
);

// ── POST /:id/import ─────────────────────────────────────────────────
router.post(
  "/:id/import",
  validateBody(importToursSchema),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      const { ids, regionCtx } = req.body;
      const result = await provider.importTours(ids, regionCtx || {});
      success(res, result);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        fail("NOT_FOUND", err.message, 404);
      }
      throw err;
    }
  }),
);

// ── POST /:id/refresh ────────────────────────────────────────────────
router.post(
  "/:id/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      await provider.refreshCache();
      const status = provider.getCacheStatus();
      success(res, status);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        fail("NOT_FOUND", err.message, 404);
      }
      throw err;
    }
  }),
);

export default router;
