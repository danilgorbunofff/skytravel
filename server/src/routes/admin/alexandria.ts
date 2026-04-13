import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  fetchAlexandriaRaw,
  fetchAlexandriaParsed,
  extractToursFromParsed,
  type AlexandriaTourInput,
} from "../../lib/alexandria.js";

const router = Router();

// ── Per-country in-memory cache ─────────────────────────────────────
const feedCacheMap = new Map<number, { data: AlexandriaTourInput[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const ALEXANDRIA_COUNTRY = Number(process.env.ALEXANDRIA_COUNTRY || 107);

async function getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
  const zeme = countryId ?? ALEXANDRIA_COUNTRY;
  const cached = feedCacheMap.get(zeme);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  const parsed = await fetchAlexandriaParsed(zeme);
  const mapped = extractToursFromParsed(parsed);
  feedCacheMap.set(zeme, { data: mapped, ts: Date.now() });
  return mapped;
}

/** Serialize a tour item for JSON response (dates → ISO strings) */
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

// ── Country discovery ────────────────────────────────────────────────
// Known Alexandria zeme IDs (discovered via probe)
const KNOWN_COUNTRIES: { id: number; name: string }[] = [
  { id: 53, name: "Bulharsko" },
  { id: 107, name: "Chorvatsko" },
  { id: 147, name: "Itálie (zima)" },
];

let countriesCache: { data: { id: number; name: string; count: number }[]; ts: number } | null = null;
const COUNTRIES_TTL = 24 * 60 * 60 * 1000; // 24h

router.get("/countries", asyncHandler(async (_req, res) => {
  if (countriesCache && Date.now() - countriesCache.ts < COUNTRIES_TTL) {
    return res.json({ items: countriesCache.data });
  }

  const results: { id: number; name: string; count: number }[] = [];

  // Probe known IDs + a small extra range concurrently
  const idsToProbe = new Set(KNOWN_COUNTRIES.map((c) => c.id));
  // Also probe a few ranges where travel countries commonly fall
  for (let i = 1; i <= 200; i++) idsToProbe.add(i);

  const BATCH = 10;
  const ids = [...idsToProbe];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (zemeId) => {
        try {
          const parsed = await fetchAlexandriaParsed(zemeId);
          const tours = extractToursFromParsed(parsed);
          if (tours.length > 0) {
            // Extract country name from first tour destination
            const name = tours[0].destination.split(" – ")[0] || `ID ${zemeId}`;
            feedCacheMap.set(zemeId, { data: tours, ts: Date.now() });
            return { id: zemeId, name, count: tours.length };
          }
        } catch {
          // skip
        }
        return null;
      }),
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name, "cs"));
  countriesCache = { data: results, ts: Date.now() };
  res.json({ items: results });
}));

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

// ── Filtered feed browsing with pagination ──────────────────────────
router.get("/tours", asyncHandler(async (req, res) => {
  const countryId = req.query.zeme !== undefined ? Number(req.query.zeme) : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
  const transport = typeof req.query.transport === "string" ? req.query.transport : "";
  const board = typeof req.query.board === "string" ? req.query.board : "";
  const stars = typeof req.query.stars === "string" ? req.query.stars : "";
  const priceMin = req.query.priceMin !== undefined ? Number(req.query.priceMin) : undefined;
  const priceMax = req.query.priceMax !== undefined ? Number(req.query.priceMax) : undefined;
  const dateStart = typeof req.query.dateStart === "string" ? new Date(req.query.dateStart) : undefined;
  const dateEnd = typeof req.query.dateEnd === "string" ? new Date(req.query.dateEnd) : undefined;
  const refresh = req.query.refresh === "true";

  // Sorting
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "price";
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

  // Pagination
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  if (refresh && countryId !== undefined) {
    feedCacheMap.delete(countryId);
  } else if (refresh) {
    feedCacheMap.clear();
  }

  const items = await getCachedFeed(countryId);

  let filtered = items;

  if (q) {
    filtered = filtered.filter(
      (t) =>
        t.destination.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        t.board.toLowerCase().includes(q),
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

  if (board) {
    filtered = filtered.filter((t) => t.board === board);
  }

  if (stars) {
    filtered = filtered.filter((t) => t.stars === stars);
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

  // ── Optional destination grouping ──
  // When groupBy=destination, collapse offers into one item per destination,
  // keeping the cheapest offer as the representative.
  const groupBy = typeof req.query.groupBy === "string" ? req.query.groupBy : "";
  const uniqueDestinations = new Set(sorted.map((t) => t.destination)).size;

  let output: AlexandriaTourInput[];

  if (groupBy === "destination") {
    // Pre-compute counts and cheapest per destination in one pass
    const counts = new Map<string, number>();
    const cheapest = new Map<string, AlexandriaTourInput>();
    for (const t of sorted) {
      counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1);
      const existing = cheapest.get(t.destination);
      if (!existing || t.price < existing.price) {
        cheapest.set(t.destination, t);
      }
    }
    // Build grouped list preserving sort order of first appearance
    const grouped: (AlexandriaTourInput & { offersCount: number })[] = [];
    const seen = new Set<string>();
    for (const t of sorted) {
      if (seen.has(t.destination)) continue;
      seen.add(t.destination);
      const best = cheapest.get(t.destination)!;
      grouped.push({ ...best, offersCount: counts.get(t.destination) ?? 1 });
    }
    output = grouped;
  } else {
    output = sorted;
  }

  // Paginate
  const totalPages = Math.ceil(output.length / limit);
  const start = (page - 1) * limit;
  const pageItems = output.slice(start, start + limit);

  res.json({
    total: items.length,
    filtered: groupBy === "destination" ? output.length : sorted.length,
    uniqueDestinations,
    page,
    limit,
    totalPages,
    items: pageItems.map((item) => {
      const base = serializeItem(item);
      if ("offersCount" in item) {
        return { ...base, offersCount: (item as any).offersCount };
      }
      return base;
    }),
  });
}));

// ── Clear cache ──────────────────────────────────────────────────────
router.post("/refresh", (_req, res) => {
  feedCacheMap.clear();
  countriesCache = null;
  res.json({ ok: true, message: "Cache cleared" });
});

export default router;
