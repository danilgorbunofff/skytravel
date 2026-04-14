import { Router, Request, Response } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  getProvider,
  getAllProviders,
} from "../../providers/index.js";
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
    res.json({ providers });
  }),
);

// ── GET /:id/regions ──────────────────────────────────────────────────
router.get(
  "/:id/regions",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      const items = await provider.getRegions();
      res.json({ items });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        res.status(404).json({ error: err.message });
        return;
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
      res.json(status);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        res.status(404).json({ error: err.message });
        return;
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

// ── GET /:id/tours/stream (SSE) ──────────────────────────────────────
router.get(
  "/:id/tours/stream",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      let closed = false;
      req.on("close", () => {
        closed = true;
      });

      const sendSSE = (event: string, data: unknown) => {
        if (closed) return;
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

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

      sendSSE("start", { total: 0 });

      let totalLoaded = 0;

      if (provider.supportsStreaming) {
        await provider.streamTours(filters, ({ batch, loaded }) => {
          totalLoaded = loaded;
          sendSSE("batch", { items: batch, progress: { loaded } });
        });
      } else {
        const result = await provider.fetchTours({ ...filters, limit: 10000 });
        totalLoaded = result.items.length;
        sendSSE("batch", {
          items: result.items,
          progress: { loaded: totalLoaded },
        });
      }

      sendSSE("done", { total: totalLoaded });
      res.end();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Unknown provider:")) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  }),
);

// ── POST /:id/import ─────────────────────────────────────────────────
router.post(
  "/:id/import",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);

      const { ids, regionCtx } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "body.ids must be a non-empty array of strings" });
        return;
      }

      const result = await provider.importTours(ids, regionCtx || {});
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

// ── POST /:id/refresh ────────────────────────────────────────────────
router.post(
  "/:id/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const provider = getProvider(req.params.id);
      await provider.refreshCache();
      res.json({ ok: true });
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
