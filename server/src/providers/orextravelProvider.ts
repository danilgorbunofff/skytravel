// ──────────────────────────────────────────────
// Orextravel Provider
// ──────────────────────────────────────────────

import { type Prisma } from "../generated/prisma/client/client.js";
import prisma from "../prisma.js";
import {
  fetchTownState,
  fetchOrextravelTours,
  clearOrextravelCache,
  type OrextravelTourInput,
} from "../lib/orextravel.js";
import type {
  UnifiedTour,
  UnifiedFilters,
  ToursResult,
  ProviderRegion,
  FilterFieldDescriptor,
  CacheStatus,
} from "./types.js";
import { readRegions, writeRegions, updateRegionTourCount } from "./regionStore.js";
import { countOfferGroupsBy } from "./offerGrouping.js";
import { invalidatePublicSearchCache } from "./publicSearchCache.js";
import { ensureProviderDestinationMapping } from "./destinationStore.js";
import { isPlausibleProviderPriceCzk } from "../lib/providerPrice.js";
import { logger } from "../lib/logger.js";
import {
  BaseProvider,
  parseNightsRange,
  buildTourSelect,
  type TourQuery,
} from "./BaseProvider.js";
import { LRUCache } from "lru-cache";

export class OrextravelProvider extends BaseProvider {
  readonly id = "orextravel";
  readonly label = "Orextravel";
  readonly supportsStreaming = true;
  readonly refreshIntervalMs = 45 * 60 * 1000; // 45 min

  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 min

  private feedCache = new LRUCache<string, { data: OrextravelTourInput[]; ts: number }>({
    max: 20,
    ttl: this.CACHE_TTL,
  });

  // Override the cache status TTL to match this provider's CACHE_TTL
  protected override _cacheStatusSnapshot: CacheStatus = {
    lastRefresh: null,
    ttl: this.CACHE_TTL,
    itemCount: 0,
    warm: false,
    syncing: false,
  };

  // ── Private helpers ───────────────────────────────────────────────

  private async getCachedFeed(townFrom?: number, stateId?: number): Promise<OrextravelTourInput[]> {
    const key = `${townFrom ?? "all"}-${stateId ?? "all"}`;
    const cached = this.feedCache.get(key);
    if (cached) return cached.data;
    const data = await fetchOrextravelTours(townFrom, stateId);
    this.feedCache.set(key, { data, ts: Date.now() });
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
    const { where, nightsRange } = this.buildQuery(filters ?? { providerFilters: {} });
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

  protected buildQuery(
    filters: UnifiedFilters,
  ): TourQuery & { townFrom?: number; stateId?: number } {
    const pf = filters.providerFilters;
    const townFrom = pf.townFrom !== undefined ? Number(pf.townFrom) : undefined;
    const stateId = pf.stateId !== undefined ? Number(pf.stateId) : undefined;

    const regionKey = `${townFrom ?? "all"}-${stateId ?? "all"}`;
    const sortBy = filters.sortBy ?? "price";
    const sortDir: "asc" | "desc" = filters.sortDir ?? "asc";
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(1_000, Math.max(1, filters.limit ?? 50));
    const nightsRange = parseNightsRange(filters.nights);

    // Build the shared WHERE clause (source, price floor, text search,
    // transport, board, stars, price range, date range)
    const where = this.buildWhereClause(filters);

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

    return { where, sortBy, sortDir, page, limit, nightsRange, townFrom, stateId };
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    const { where, sortBy, sortDir, page, limit, townFrom, stateId, nightsRange } =
      this.buildQuery(filters);
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
            where: {
              source: this.id,
              ...(where.regionKey ? { regionKey: where.regionKey } : {}),
            },
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

  async refreshCache(): Promise<void> {
    this.feedCache.clear();
    clearOrextravelCache();
    await this.syncToDb();
  }

  override async loadCacheStatus(): Promise<void> {
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

  protected async _syncToDbImpl(): Promise<void> {
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
          // Add IDs before parallel upserts
          for (const item of batch) {
            seenIds.add(item.externalId);
          }
          // Parallel upserts within each batch
          await Promise.all(
            batch.map((item) =>
              prisma.providerTour.upsert({
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
              }),
            ),
          );
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

        logger.info(`[Orextravel] Synced ${count} tours for route ${regionKey}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.providerSync.update({
          where: { providerId_regionKey: { providerId: this.id, regionKey } },
          data: { status: "error", errorMessage: msg },
        });
        logger.error({ err }, `[Orextravel] Sync failed for route ${regionKey}`);
      }
    }
    await this.loadCacheStatus();
    invalidatePublicSearchCache(this.id);
  }
}
