// ──────────────────────────────────────────────
// Orextravel Provider
// ──────────────────────────────────────────────

import prisma from "../prisma.js";
import {
  fetchTownState,
  fetchOrextravelTours,
  clearOrextravelCache,
  clearTourCache,
  type OrextravelTourInput,
} from "../lib/orextravel.js";
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

export class OrextravelProvider implements TourProvider {
  readonly id = "orextravel";
  readonly label = "Orextravel";
  readonly supportsStreaming = true;
  readonly refreshIntervalMs = 45 * 60 * 1000; // 45 min

  private feedCacheMap = new Map<
    string,
    { data: OrextravelTourInput[]; ts: number }
  >();

  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 min

  // ── Private helpers ───────────────────────────────────────────────

  private async getCachedFeed(
    townFrom?: number,
    stateId?: number,
  ): Promise<OrextravelTourInput[]> {
    const key = `${townFrom ?? "all"}-${stateId ?? "all"}`;
    const cached = this.feedCacheMap.get(key);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }
    const data = await fetchOrextravelTours(townFrom, stateId);
    this.feedCacheMap.set(key, { data, ts: Date.now() });
    return data;
  }

  private serializeItem(item: OrextravelTourInput): UnifiedTour {
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
      source: this.id,
      nights: item.nights,
      adults: item.adults,
      children: item.children,
      roomType: item.roomType,
      currency: item.currency,
    };
  }

  // ── TourProvider interface ────────────────────────────────────────

  async getRegions(): Promise<ProviderRegion[]> {
    const routes = await fetchTownState();
    return routes.map((r) => ({
      id: r.state,
      name: r.stateName,
      meta: {
        town: r.town,
        townName: r.townName,
        departureId: r.town,
        departureName: r.townName,
        packetType: r.packetType,
      },
    }));
  }

  getProviderFilters(): FilterFieldDescriptor[] {
    return [
      {
        key: "townFrom",
        label: "Odjezd z",
        type: "select",
        options: [],
      },
      {
        key: "stateId",
        label: "Destinace",
        type: "select",
        options: [],
        dependsOn: "townFrom",
      },
    ];
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    const pf = filters.providerFilters;
    const townFrom =
      pf.townFrom !== undefined ? Number(pf.townFrom) : undefined;
    const stateId =
      pf.stateId !== undefined ? Number(pf.stateId) : undefined;

    const regionKey = `${townFrom ?? "all"}-${stateId ?? "all"}`;
    const sortBy = filters.sortBy ?? "price";
    const sortDir = filters.sortDir ?? "asc";
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));

    // Build Prisma where clause
    const where: any = { source: this.id };

    // Region filtering: if specific route selected, use exact key;
    // otherwise match any region for this provider
    if (townFrom !== undefined || stateId !== undefined) {
      if (townFrom !== undefined && stateId !== undefined) {
        where.regionKey = regionKey;
      } else if (townFrom !== undefined) {
        where.regionKey = { startsWith: `${townFrom}-` };
      } else if (stateId !== undefined) {
        where.regionKey = { endsWith: `-${stateId}` };
      }
    }

    if (filters.q) {
      const q = filters.q;
      where.OR = [
        { destination: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { board: { contains: q } },
        { roomType: { contains: q } },
      ];
    }

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
      prisma.providerTour.count({ where: { source: this.id, ...(where.regionKey ? { regionKey: where.regionKey } : {}) } }),
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
      nights: row.nights ?? undefined,
      adults: row.adults ?? undefined,
      children: row.children ?? undefined,
      roomType: row.roomType ?? undefined,
      currency: row.currency ?? undefined,
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
      const existing = await prisma.tour.findFirst({
        where: { source: "orextravel", externalId: row.externalId },
      });

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
        source: "orextravel" as const,
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
    clearOrextravelCache();
    await this.syncToDb();
  }

  getCacheStatus(): CacheStatus {
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
    const routes = await fetchTownState();

    // Group routes by departure→destination key
    const routeGroups = new Map<string, typeof routes>();
    for (const r of routes) {
      const key = `${r.town}-${r.state}`;
      if (!routeGroups.has(key)) routeGroups.set(key, []);
      routeGroups.get(key)!.push(r);
    }

    for (const [regionKey, groupRoutes] of routeGroups) {
      const firstRoute = groupRoutes[0];
      await prisma.providerSync.upsert({
        where: { providerId_regionKey: { providerId: this.id, regionKey } },
        create: { providerId: this.id, regionKey, status: "syncing" },
        update: { status: "syncing", errorMessage: null },
      });

      try {
        const items = await fetchOrextravelTours(firstRoute.town, firstRoute.state);

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
                nights: item.nights,
                adults: item.adults,
                children: item.children,
                roomType: item.roomType,
                currency: item.currency,
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
                nights: item.nights,
                adults: item.adults,
                children: item.children,
                roomType: item.roomType,
                currency: item.currency,
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

        console.log(`[Orextravel] Synced ${count} tours for route ${regionKey}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.providerSync.update({
          where: { providerId_regionKey: { providerId: this.id, regionKey } },
          data: { status: "error", errorMessage: msg },
        });
        console.error(`[Orextravel] Sync failed for route ${regionKey}:`, err);
      }
    }
    await this.loadCacheStatus();
  }
}
