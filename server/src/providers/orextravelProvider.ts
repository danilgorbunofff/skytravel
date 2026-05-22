// ──────────────────────────────────────────────
// Orextravel Provider
// ──────────────────────────────────────────────

import { type Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import {
  fetchTownState,
  fetchOrextravelTours,
  clearOrextravelCache,
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
import { readRegions, writeRegions, updateRegionTourCount } from "./regionStore.js";
import {
  countOfferGroupsBy,
  groupOfferRows,
  MAX_GROUPED_TOUR_ROWS,
  sortOfferGroups,
  sortOfferRows,
} from "./offerGrouping.js";
import { invalidatePublicSearchCache } from "./publicSearchCache.js";
import { ensureProviderDestinationMapping } from "./destinationStore.js";
import { MIN_PROVIDER_TOUR_PRICE_CZK, isPlausibleProviderPriceCzk } from "../lib/providerPrice.js";

type NightsRange = { min: number; max: number } | null;

function parseNightsRange(value: string | undefined): NightsRange {
  if (!value) return null;
  const [min, max] = value.split("-").map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

function nightsFromDates(startDate: Date | string, endDate: Date | string): number | null {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : null;
}

function photosFromJson(value: unknown, image: string): string[] {
  const photos = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  return photos.length > 0 ? photos : image ? [image] : [];
}

// Prisma `select` for ProviderTour list/grouped queries. When `omitHeavy`
// is true, skips the large columns (`url`, `description`, `photos`) that
// the public SearchPage never displays. Saves DB read time and wire bytes.
function buildTourSelect(omitHeavy: boolean) {
  return {
    id: true,
    externalId: true,
    source: true,
    regionKey: true,
    destination: true,
    title: true,
    price: true,
    originalPrice: true,
    startDate: true,
    endDate: true,
    transport: true,
    image: true,
    stars: true,
    board: true,
    nights: true,
    adults: true,
    children: true,
    roomType: true,
    currency: true,
    offersCount: true,
    syncedAt: true,
    createdAt: true,
    ...(omitHeavy ? {} : { url: true, description: true, photos: true }),
  } as const;
}

export class OrextravelProvider implements TourProvider {
  readonly id = "orextravel";
  readonly label = "Orextravel";
  readonly supportsStreaming = true;
  readonly refreshIntervalMs = 45 * 60 * 1000; // 45 min

  private feedCacheMap = new Map<string, { data: OrextravelTourInput[]; ts: number }>();

  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 min
  private syncMutex: Promise<void> | null = null;

  // ── Private helpers ───────────────────────────────────────────────

  private async getCachedFeed(townFrom?: number, stateId?: number): Promise<OrextravelTourInput[]> {
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

  async getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]> {
    // Fast path: read from DB (with 5-min in-process L1 cache).
    // Each row is a (town, state) pair; the original API shape with
    // departureId/departureName lives in `meta` so the client renders
    // the two-level filter exactly as before.
    const fromDb = await readRegions(this.id);
    if (fromDb.length > 0) return this.withGroupedRegionCounts(fromDb, filters);

    // Cold-start fallback: hit upstream once so the very first user after a
    // fresh deploy still sees something. The next call hits DB.
    // Deduplicate by state ID so multiple departure cities for the same
    // state don't produce duplicate Oblast entries.
    const routes = await fetchTownState();
    const seen = new Set<number>();
    const deduped: typeof routes = [];
    for (const r of routes) {
      if (!seen.has(r.state)) {
        seen.add(r.state);
        deduped.push(r);
      }
    }
    return deduped.map((r) => ({
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

  private async withGroupedRegionCounts(
    regions: ProviderRegion[],
    filters?: UnifiedFilters,
  ): Promise<ProviderRegion[]> {
    const { where, nightsRange } = this.buildTourQuery(filters ?? { providerFilters: {} });
    const rows = await prisma.providerTour.findMany({
      where,
      select: {
        regionKey: true,
        source: true,
        title: true,
        destination: true,
        price: true,
        startDate: true,
        endDate: true,
        nights: true,
      },
    });
    const counts = countOfferGroupsBy(
      this.filterRowsByNights(rows, nightsRange),
      (row) => row.regionKey,
    );
    return regions.map((region) => {
      const departureId = region.meta?.departureId;
      const key = departureId != null ? `${departureId}-${region.id}` : String(region.id);
      return {
        ...region,
        count: counts.get(key) ?? undefined,
      };
    });
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
      { key: "board", label: "Stravování", type: "select", options: [] },
      { key: "stars", label: "Hvězdy", type: "select", options: [] },
    ];
  }

  private buildTourQuery(filters: UnifiedFilters): {
    where: Prisma.ProviderTourWhereInput;
    sortBy: string;
    sortDir: "asc" | "desc";
    page: number;
    limit: number;
    townFrom: number | undefined;
    stateId: number | undefined;
    nightsRange: NightsRange;
  } {
    const pf = filters.providerFilters;
    const townFrom = pf.townFrom !== undefined ? Number(pf.townFrom) : undefined;
    const stateId = pf.stateId !== undefined ? Number(pf.stateId) : undefined;

    const regionKey = `${townFrom ?? "all"}-${stateId ?? "all"}`;
    const sortBy = filters.sortBy ?? "price";
    const sortDir = filters.sortDir ?? "asc";
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(1_000, Math.max(1, filters.limit ?? 50));
    const board =
      typeof filters.board === "string"
        ? filters.board
        : typeof pf.board === "string"
          ? pf.board
          : "";
    const stars =
      typeof filters.stars === "string"
        ? filters.stars
        : typeof pf.stars === "string"
          ? pf.stars
          : "";
    const transport = typeof pf.transport === "string" ? pf.transport : "";
    const nightsRange = parseNightsRange(filters.nights);

    // Build Prisma where clause
    const where: Prisma.ProviderTourWhereInput = {
      source: this.id,
      price: { gte: MIN_PROVIDER_TOUR_PRICE_CZK },
    };

    // Region filtering: if specific route selected, use exact key;
    // otherwise match any region for this provider
    if (townFrom !== undefined || stateId !== undefined) {
      if (townFrom !== undefined && stateId !== undefined) {
        where.regionKey = regionKey;
      } else if (townFrom !== undefined) {
        where.regionKey = { startsWith: `${townFrom}-` };
      } else if (stateId !== undefined) {
        where.stateId = stateId;
      }
    }

    if (filters.q) {
      const q = filters.q;
      where.OR = [{ destination: { startsWith: q } }, { title: { contains: q } }];
    }

    if (board) where.board = board;
    if (transport) where.transport = transport;
    if (stars) {
      const minStars = Number(stars);
      if (Number.isFinite(minStars)) {
        where.stars = {
          in: ["1", "2", "3", "4", "5"].filter((value) => Number(value) >= minStars),
        };
      }
    }

    if (filters.priceMin !== undefined && Number.isFinite(filters.priceMin)) {
      where.price = {
        ...(where.price as object),
        gte: Math.max(filters.priceMin, MIN_PROVIDER_TOUR_PRICE_CZK),
      };
    }
    if (filters.priceMax !== undefined && Number.isFinite(filters.priceMax)) {
      where.price = { ...(where.price as object), lte: filters.priceMax };
    }

    if (filters.dateStart) {
      const ds = new Date(filters.dateStart);
      if (!Number.isNaN(ds.getTime())) {
        where.startDate = { ...(where.startDate as object), gte: ds };
      }
    }
    if (filters.dateEnd) {
      const de = new Date(filters.dateEnd);
      if (!Number.isNaN(de.getTime())) {
        where.endDate = { ...(where.endDate as object), lte: de };
      }
    }

    return { where, sortBy, sortDir, page, limit, townFrom, stateId, nightsRange };
  }

  private filterRowsByNights<
    T extends { startDate: Date | string; endDate: Date | string; nights?: number | null },
  >(rows: T[], nightsRange: NightsRange): T[] {
    if (!nightsRange) return rows;
    return rows.filter((row) => {
      const nights = row.nights ?? nightsFromDates(row.startDate, row.endDate);
      return nights != null && nights >= nightsRange.min && nights <= nightsRange.max;
    });
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    const { where, sortBy, sortDir, page, limit, townFrom, stateId, nightsRange } =
      this.buildTourQuery(filters);
    const omitHeavy = filters.omitHeavy === true;

    if (filters.groupResults) {
      return this.fetchGroupedByOffer(where, sortBy, sortDir, page, limit, nightsRange, omitHeavy);
    }

    const orderBy: Prisma.ProviderTourOrderByWithRelationInput =
      sortBy === "date" ? { startDate: sortDir } : { price: sortDir };

    const hasTextFilter = Boolean(filters.q);
    const hasPriceFilter = filters.priceMin !== undefined || filters.priceMax !== undefined;
    const hasDateFilter = filters.dateStart !== undefined || filters.dateEnd !== undefined;
    const needsSeparateTotal = hasTextFilter || hasPriceFilter || hasDateFilter;

    const [items, filtered, rawTotal, uniqueDestinations] = await Promise.all([
      prisma.providerTour.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: buildTourSelect(omitHeavy),
      }),
      prisma.providerTour.count({ where }),
      needsSeparateTotal
        ? prisma.providerTour.count({
            where: { source: this.id, ...(where.regionKey ? { regionKey: where.regionKey } : {}) },
          })
        : Promise.resolve(null),
      // Count distinct destination states from ProviderRegion (small table)
      // instead of scanning the entire filtered ProviderTour set.
      this.countDistinctDestinations(townFrom, stateId),
    ]);

    const total = rawTotal ?? filtered;

    const totalPages = Math.ceil(filtered / limit);

    return {
      total,
      filtered,
      uniqueDestinations,
      page,
      limit,
      totalPages,
      items: items.map((row) => this.rowToUnified(row)),
    };
  }

  private async countDistinctDestinations(
    townFrom: number | undefined,
    stateId: number | undefined,
  ): Promise<number> {
    if (stateId !== undefined) return 1;
    const where: Record<string, unknown> = { providerId: this.id };
    if (townFrom !== undefined) {
      where.parentExternalId = String(townFrom);
    }
    const rows = await prisma.providerRegion.findMany({
      where,
      select: { externalId: true },
      distinct: ["externalId"],
    });
    return rows.length;
  }

  private rowToUnified(row: Record<string, unknown>): UnifiedTour {
    const nights =
      (row.nights as number | null) ??
      nightsFromDates(row.startDate as string | Date, row.endDate as string | Date) ??
      undefined;
    return {
      externalId: row.externalId as string,
      destination: row.destination as string,
      title: row.title as string,
      price: row.price as number,
      originalPrice: row.originalPrice as number,
      startDate:
        row.startDate instanceof Date ? row.startDate.toISOString() : (row.startDate as string),
      endDate: row.endDate instanceof Date ? row.endDate.toISOString() : (row.endDate as string),
      transport: row.transport as string,
      image: row.image as string,
      description: (row.description as string) ?? null,
      photos: photosFromJson(row.photos, row.image as string),
      url: (row.url as string) ?? "",
      stars: row.stars as string,
      board: row.board as string,
      source: this.id,
      nights,
      adults: (row.adults as number) ?? undefined,
      children: (row.children as number) ?? undefined,
      roomType: (row.roomType as string) ?? undefined,
      currency: (row.currency as string) ?? undefined,
    };
  }

  private async fetchGroupedByOffer(
    where: Prisma.ProviderTourWhereInput,
    sortBy: string,
    sortDir: string,
    page: number,
    limit: number,
    nightsRange: NightsRange,
    omitHeavy = false,
  ): Promise<ToursResult> {
    const [allFiltered, rawFilteredDb] = await Promise.all([
      prisma.providerTour.findMany({
        where,
        orderBy: { price: "asc" },
        take: MAX_GROUPED_TOUR_ROWS,
        select: buildTourSelect(omitHeavy),
      }),
      prisma.providerTour.count({ where }),
    ]);

    const filteredRows = this.filterRowsByNights(allFiltered, nightsRange);
    const rawFilteredOffers = nightsRange ? filteredRows.length : rawFilteredDb;
    const grouped = sortOfferGroups(groupOfferRows(filteredRows), sortBy, sortDir);
    const filteredCount = grouped.length;
    const totalPages = Math.ceil(filteredCount / limit);
    const start = (page - 1) * limit;
    const pageItems = grouped.slice(start, start + limit);

    return {
      total: filteredCount,
      filtered: filteredCount,
      rawTotalOffers: rawFilteredOffers,
      rawFilteredOffers,
      uniqueDestinations: filteredCount,
      page,
      limit,
      totalPages,
      items: pageItems.map((entry) => ({
        ...this.rowToUnified(entry.representative),
        offerGroupKey: entry.key,
        offersCount: entry.offers.length,
      })),
    };
  }

  async fetchOfferGroup(filters: UnifiedFilters, offerGroupKey: string): Promise<UnifiedTour[]> {
    const { where, sortBy, sortDir, nightsRange } = this.buildTourQuery(filters);
    const rows = await prisma.providerTour.findMany({
      where,
      orderBy: { price: "asc" },
      take: MAX_GROUPED_TOUR_ROWS,
    });
    const group = groupOfferRows(this.filterRowsByNights(rows, nightsRange)).find(
      (entry) => entry.key === offerGroupKey,
    );
    if (!group) return [];

    return sortOfferRows(group.offers, sortBy, sortDir).map((row) => ({
      ...this.rowToUnified(row),
      offerGroupKey,
      offersCount: group.offers.length,
    }));
  }

  async streamTours(filters: UnifiedFilters, onBatch: StreamCallback): Promise<void> {
    const result = await this.fetchTours(filters);
    onBatch({ batch: result.items, loaded: result.items.length });
  }

  async importTours(ids: string[], _regionCtx: Record<string, unknown>): Promise<ImportResult> {
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
    if (this.syncMutex) return this.syncMutex;
    this.syncMutex = this._syncToDbImpl().finally(() => {
      this.syncMutex = null;
    });
    return this.syncMutex;
  }

  private async _syncToDbImpl(): Promise<void> {
    const routes = await fetchTownState();

    // Persist regions up front so getRegions() works immediately, even if
    // tour sync fails for some routes.
    await writeRegions(
      this.id,
      routes.map((r) => ({
        regionKey: `${r.town}-${r.state}`,
        externalId: String(r.state),
        parentExternalId: String(r.town),
        name: r.stateName,
        meta: {
          town: r.town,
          townName: r.townName,
          departureId: r.town,
          departureName: r.townName,
          packetType: r.packetType,
        },
      })),
    );

    // Group routes by departure→destination key
    const routeGroups = new Map<string, typeof routes>();
    for (const r of routes) {
      const key = `${r.town}-${r.state}`;
      const arr = routeGroups.get(key) ?? [];
      arr.push(r);
      routeGroups.set(key, arr);
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
        const destinationId = await ensureProviderDestinationMapping({
          providerId: this.id,
          providerKey: "stateId",
          providerValue: String(firstRoute.state),
          providerLabel: firstRoute.stateName,
        });

        const BATCH = 100;
        const seenIds = new Set<string>();
        const validItems = items.filter((item) => isPlausibleProviderPriceCzk(item.price));
        for (let i = 0; i < validItems.length; i += BATCH) {
          const batch = validItems.slice(i, i + BATCH);
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
                stateId: firstRoute.state ?? null,
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
                destinationId,
                syncedAt: new Date(),
              },
              update: {
                regionKey,
                stateId: firstRoute.state ?? null,
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
                destinationId,
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
        await updateRegionTourCount(this.id, regionKey, count);

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
    invalidatePublicSearchCache(this.id);
  }
}
