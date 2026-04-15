// ──────────────────────────────────────────────
// Alexandria Provider
// ──────────────────────────────────────────────

import { config } from "../config.js";
import prisma from "../prisma.js";
import {
  fetchAlexandriaParsed,
  extractToursFromParsed,
  type AlexandriaTourInput,
} from "../lib/alexandria.js";
import type {
  TourProvider,
  UnifiedTour,
  UnifiedFilters,
  ToursResult,
  ImportResult,
  CacheStatus,
  StreamCallback,
  ProviderRegion,
  FilterFieldDescriptor,
} from "./types.js";

// ── Hardcoded known countries (replaces 200-ID probe loop) ──────────
const KNOWN_COUNTRIES: { id: number; name: string }[] = [
  { id: 53, name: "Bulharsko" },
  { id: 107, name: "Chorvatsko" },
  { id: 147, name: "Itálie" },
];

export class AlexandriaProvider implements TourProvider {
  readonly id = "alexandria";
  readonly label = "Alexandria";
  readonly supportsStreaming = false;
  readonly refreshIntervalMs = 25 * 60 * 1000; // 25 min

  private feedCacheMap = new Map<
    number,
    { data: AlexandriaTourInput[]; ts: number }
  >();
  private regionsCache: {
    data: ProviderRegion[];
    ts: number;
  } | null = null;

  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 min
  private readonly REGIONS_TTL = 24 * 60 * 60 * 1000; // 24h

  // ── Private helpers ───────────────────────────────────────────────

  private async getCachedFeed(
    countryId?: number,
  ): Promise<AlexandriaTourInput[]> {
    const zeme = countryId ?? config.alexandria.country;
    const cached = this.feedCacheMap.get(zeme);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }
    const parsed = await fetchAlexandriaParsed(zeme);
    const mapped = extractToursFromParsed(parsed);
    this.feedCacheMap.set(zeme, { data: mapped, ts: Date.now() });
    return mapped;
  }

  private serializeItem(
    item: AlexandriaTourInput,
    offersCount?: number,
  ): UnifiedTour {
    const tour: UnifiedTour = {
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
      source: this.id,
    };
    if (offersCount !== undefined) {
      tour.offersCount = offersCount;
    }
    return tour;
  }

  // ── TourProvider interface ────────────────────────────────────────

  async getRegions(): Promise<ProviderRegion[]> {
    if (
      this.regionsCache &&
      Date.now() - this.regionsCache.ts < this.REGIONS_TTL
    ) {
      return this.regionsCache.data;
    }

    const results: ProviderRegion[] = [];

    const settled = await Promise.allSettled(
      KNOWN_COUNTRIES.map(async (c) => {
        const tours = await this.getCachedFeed(c.id);
        return { id: c.id, name: c.name, count: tours.length };
      }),
    );

    for (const r of settled) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      }
    }

    results.sort((a, b) => a.name.localeCompare(b.name, "cs"));
    this.regionsCache = { data: results, ts: Date.now() };
    return results;
  }

  getProviderFilters(): FilterFieldDescriptor[] {
    return [
      {
        key: "zeme",
        label: "Země",
        type: "select",
        options: KNOWN_COUNTRIES.map((c) => ({
          value: c.id,
          label: c.name,
        })),
      },
      { key: "transport", label: "Doprava", type: "select", options: [] },
      { key: "board", label: "Stravování", type: "select", options: [] },
      { key: "stars", label: "Hvězdy", type: "select", options: [] },
      {
        key: "groupBy",
        label: "Seskupit dle",
        type: "select",
        options: [
          { value: "", label: "Neseskupovat" },
          { value: "destination", label: "Dle destinace" },
        ],
      },
    ];
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    const pf = filters.providerFilters;
    const zeme =
      pf.zeme !== undefined ? Number(pf.zeme) : config.alexandria.country;
    const transport = typeof pf.transport === "string" ? pf.transport : "";
    const board = typeof pf.board === "string" ? pf.board : "";
    const stars = typeof pf.stars === "string" ? pf.stars : "";
    const groupBy = typeof pf.groupBy === "string" ? pf.groupBy : "";

    const regionKey = String(zeme);
    const sortBy = filters.sortBy ?? "price";
    const sortDir = filters.sortDir ?? "asc";
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));

    // Build Prisma where clause
    const where: any = { source: this.id, regionKey };

    if (filters.q) {
      const q = filters.q;
      where.OR = [
        { destination: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { board: { contains: q } },
      ];
    }

    if (transport) where.transport = transport;
    if (board) where.board = board;
    if (stars) where.stars = stars;

    if (filters.priceMin !== undefined && Number.isFinite(filters.priceMin)) {
      where.price = { ...where.price, gte: filters.priceMin };
    }
    if (filters.priceMax !== undefined && Number.isFinite(filters.priceMax)) {
      where.price = { ...where.price, lte: filters.priceMax };
    }

    if (filters.dateStart) {
      const ds = new Date(filters.dateStart);
      if (!Number.isNaN(ds.getTime())) {
        where.startDate = { ...where.startDate, gte: ds };
      }
    }
    if (filters.dateEnd) {
      const de = new Date(filters.dateEnd);
      if (!Number.isNaN(de.getTime())) {
        where.endDate = { ...where.endDate, lte: de };
      }
    }

    // Destination grouping — uses in-memory aggregation of DB results
    if (groupBy === "destination") {
      return this.fetchGroupedByDestination(where, sortBy, sortDir, page, limit);
    }

    const orderBy: any =
      sortBy === "date"
        ? { startDate: sortDir }
        : { price: sortDir };

    const [items, filtered, total, destResult] = await Promise.all([
      prisma.providerTour.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.providerTour.count({ where }),
      prisma.providerTour.count({ where: { source: this.id, regionKey } }),
      prisma.providerTour.findMany({
        where,
        select: { destination: true },
        distinct: ["destination"],
      }),
    ]);

    const totalPages = Math.ceil(filtered / limit);

    return {
      total,
      filtered,
      uniqueDestinations: destResult.length,
      page,
      limit,
      totalPages,
      items: items.map((row) => this.rowToUnified(row)),
    };
  }

  private async fetchGroupedByDestination(
    where: any,
    sortBy: string,
    sortDir: string,
    page: number,
    limit: number,
  ): Promise<ToursResult> {
    // Get grouped counts + cheapest per destination
    const allFiltered = await prisma.providerTour.findMany({
      where,
      orderBy: { price: "asc" },
    });

    const counts = new Map<string, number>();
    const cheapest = new Map<string, typeof allFiltered[0]>();
    for (const t of allFiltered) {
      counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1);
      if (!cheapest.has(t.destination)) cheapest.set(t.destination, t);
    }

    let grouped = [...cheapest.values()].map((row) => ({
      tour: this.rowToUnified(row),
      offersCount: counts.get(row.destination) ?? 1,
    }));

    // Sort the grouped results
    grouped.sort((a, b) => {
      let d = 0;
      if (sortBy === "date") {
        d = new Date(a.tour.startDate).getTime() - new Date(b.tour.startDate).getTime();
      } else {
        d = a.tour.price - b.tour.price;
      }
      return sortDir === "asc" ? d : -d;
    });

    const total = allFiltered.length;
    const filteredCount = grouped.length;
    const totalPages = Math.ceil(filteredCount / limit);
    const start = (page - 1) * limit;
    const pageItems = grouped.slice(start, start + limit);

    return {
      total,
      filtered: filteredCount,
      uniqueDestinations: grouped.length,
      page,
      limit,
      totalPages,
      items: pageItems.map((entry) => ({
        ...entry.tour,
        offersCount: entry.offersCount,
      })),
    };
  }

  private rowToUnified(row: any): UnifiedTour {
    return {
      externalId: row.externalId,
      destination: row.destination,
      title: row.title,
      price: row.price,
      originalPrice: row.originalPrice,
      startDate: row.startDate instanceof Date ? row.startDate.toISOString() : row.startDate,
      endDate: row.endDate instanceof Date ? row.endDate.toISOString() : row.endDate,
      transport: row.transport,
      image: row.image,
      description: row.description,
      photos: Array.isArray(row.photos) ? row.photos : [],
      url: row.url,
      stars: row.stars,
      board: row.board,
      source: this.id,
      offersCount: row.offersCount ?? undefined,
    };
  }

  async streamTours(
    filters: UnifiedFilters,
    onBatch: StreamCallback,
  ): Promise<void> {
    const result = await this.fetchTours(filters);
    onBatch({ batch: result.items, loaded: result.items.length });
  }

  async importTours(
    ids: string[],
    regionCtx: Record<string, unknown>,
  ): Promise<ImportResult> {
    // Read from ProviderTour table instead of in-memory cache
    const providerRows = await prisma.providerTour.findMany({
      where: {
        source: this.id,
        externalId: { in: ids },
      },
    });

    let created = 0;
    let updated = 0;

    for (const row of providerRows) {
      const existing = row.externalId
        ? await prisma.tour.findFirst({
            where: { source: "alexandria", externalId: row.externalId },
          })
        : null;

      const data = {
        destination: row.destination,
        title: row.title,
        price: row.price,
        startDate: row.startDate,
        endDate: row.endDate,
        transport: row.transport,
        image: row.image,
        description: row.description,
        photos: Array.isArray(row.photos) && row.photos.length > 0 ? row.photos : undefined,
        source: "alexandria" as const,
        externalId: row.externalId,
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

    return { ok: true, created, updated, total: providerRows.length };
  }

  async warmCache(): Promise<void> {
    await this.syncToDb();
  }

  async refreshCache(): Promise<void> {
    this.feedCacheMap.clear();
    this.regionsCache = null;
    await this.syncToDb();
  }

  getCacheStatus(): CacheStatus {
    // Read from DB sync status
    return this._cacheStatusSnapshot;
  }

  private _cacheStatusSnapshot: CacheStatus = {
    lastRefresh: null,
    ttl: this.CACHE_TTL,
    itemCount: 0,
    warm: false,
    syncing: false,
  };

  async loadCacheStatus(): Promise<void> {
    const syncs = await prisma.providerSync.findMany({
      where: { providerId: this.id },
    });
    let itemCount = 0;
    let oldest: number | null = null;
    let syncing = false;
    for (const s of syncs) {
      itemCount += s.itemCount;
      if (s.lastSyncAt) {
        const ts = s.lastSyncAt.getTime();
        if (oldest === null || ts < oldest) oldest = ts;
      }
      if (s.status === "syncing") syncing = true;
    }
    this._cacheStatusSnapshot = {
      lastRefresh: oldest,
      ttl: this.CACHE_TTL,
      itemCount,
      warm: itemCount > 0,
      syncing,
    };
  }

  async syncToDb(): Promise<void> {
    for (const country of KNOWN_COUNTRIES) {
      const regionKey = String(country.id);
      await prisma.providerSync.upsert({
        where: { providerId_regionKey: { providerId: this.id, regionKey } },
        create: { providerId: this.id, regionKey, status: "syncing" },
        update: { status: "syncing", errorMessage: null },
      });

      try {
        const parsed = await fetchAlexandriaParsed(country.id);
        const items = extractToursFromParsed(parsed);

        // Upsert in batches
        const BATCH = 100;
        const seenIds = new Set<string>();
        for (let i = 0; i < items.length; i += BATCH) {
          const batch = items.slice(i, i + BATCH);
          for (const item of batch) {
            seenIds.add(item.externalId);
            await prisma.providerTour.upsert({
              where: {
                source_externalId: { source: this.id, externalId: item.externalId },
              },
              create: {
                externalId: item.externalId,
                source: this.id,
                regionKey,
                destination: item.destination,
                title: item.title,
                price: item.price,
                originalPrice: item.originalPrice,
                startDate: item.startDate,
                endDate: item.endDate,
                transport: item.transport,
                image: item.image,
                description: item.description,
                photos: item.photos.length > 0 ? item.photos : undefined,
                url: item.url,
                stars: item.stars,
                board: item.board,
                syncedAt: new Date(),
              },
              update: {
                regionKey,
                destination: item.destination,
                title: item.title,
                price: item.price,
                originalPrice: item.originalPrice,
                startDate: item.startDate,
                endDate: item.endDate,
                transport: item.transport,
                image: item.image,
                description: item.description,
                photos: item.photos.length > 0 ? item.photos : undefined,
                url: item.url,
                stars: item.stars,
                board: item.board,
                syncedAt: new Date(),
              },
            });
          }
        }

        // Delete stale rows for this region
        if (seenIds.size > 0) {
          await prisma.providerTour.deleteMany({
            where: {
              source: this.id,
              regionKey,
              externalId: { notIn: [...seenIds] },
            },
          });
        }

        const count = await prisma.providerTour.count({
          where: { source: this.id, regionKey },
        });

        await prisma.providerSync.update({
          where: { providerId_regionKey: { providerId: this.id, regionKey } },
          data: { status: "idle", lastSyncAt: new Date(), itemCount: count },
        });

        console.log(`[Alexandria] Synced ${count} tours for country ${country.name} (${country.id})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.providerSync.update({
          where: { providerId_regionKey: { providerId: this.id, regionKey } },
          data: { status: "error", errorMessage: msg },
        });
        console.error(`[Alexandria] Sync failed for country ${country.name}:`, err);
      }
    }
    await this.loadCacheStatus();
  }
}
