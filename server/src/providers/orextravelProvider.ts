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

    if (filters.refresh) {
      const key = `${townFrom ?? "all"}-${stateId ?? "all"}`;
      this.feedCacheMap.delete(key);
      clearTourCache();
    }

    const items = await this.getCachedFeed(townFrom, stateId);

    const q = filters.q?.toLowerCase() ?? "";
    const priceMin = filters.priceMin;
    const priceMax = filters.priceMax;
    const dateStart = filters.dateStart
      ? new Date(filters.dateStart)
      : undefined;
    const dateEnd = filters.dateEnd ? new Date(filters.dateEnd) : undefined;
    const sortBy = filters.sortBy ?? "price";
    const sortDir = filters.sortDir ?? "asc";
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));

    let filtered = items;

    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.destination.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false) ||
          t.board.toLowerCase().includes(q) ||
          t.roomType.toLowerCase().includes(q),
      );
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

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let d = 0;
      if (sortBy === "date") {
        d = a.startDate.getTime() - b.startDate.getTime();
      } else {
        d = a.price - b.price;
      }
      return sortDir === "asc" ? d : -d;
    });

    const uniqueDestinations = new Set(sorted.map((t) => t.destination)).size;

    // Paginate
    const totalPages = Math.ceil(sorted.length / limit);
    const start = (page - 1) * limit;
    const pageItems = sorted.slice(start, start + limit);

    return {
      total: items.length,
      filtered: sorted.length,
      uniqueDestinations,
      page,
      limit,
      totalPages,
      items: pageItems.map((item) => this.serializeItem(item)),
    };
  }

  async streamTours(
    filters: UnifiedFilters,
    onBatch: StreamCallback,
  ): Promise<void> {
    const pf = filters.providerFilters;
    const townFrom =
      pf.townFrom !== undefined ? Number(pf.townFrom) : undefined;
    const stateId =
      pf.stateId !== undefined ? Number(pf.stateId) : undefined;

    let loaded = 0;

    await fetchOrextravelTours(townFrom, stateId, ({ batch }) => {
      const serialized = batch.map((item) => this.serializeItem(item));
      loaded += serialized.length;
      onBatch({ batch: serialized, loaded });
    });

    // Populate feedCacheMap for subsequent paginated requests
    await this.getCachedFeed(townFrom, stateId);
  }

  async importTours(
    ids: string[],
    regionCtx: Record<string, unknown>,
  ): Promise<ImportResult> {
    const townFrom =
      regionCtx.townFrom !== undefined
        ? Number(regionCtx.townFrom)
        : undefined;
    const stateId =
      regionCtx.stateId !== undefined
        ? Number(regionCtx.stateId)
        : undefined;

    const items = await this.getCachedFeed(townFrom, stateId);
    const toImport = items.filter((item) => ids.includes(item.externalId));

    let created = 0;
    let updated = 0;

    for (const item of toImport) {
      const existing = await prisma.tour.findFirst({
        where: { source: "orextravel", externalId: item.externalId },
      });

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
        source: "orextravel" as const,
        externalId: item.externalId,
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

    return { ok: true, created, updated, total: toImport.length };
  }

  async warmCache(): Promise<void> {
    const items = await this.getCachedFeed();
    console.log(`[Orextravel] Cache warmed: ${items.length} tours`);
  }

  async refreshCache(): Promise<void> {
    this.feedCacheMap.clear();
    clearOrextravelCache();
    await this.warmCache();
  }

  getCacheStatus(): CacheStatus {
    let itemCount = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const entry of this.feedCacheMap.values()) {
      itemCount += entry.data.length;
      if (oldest === null || entry.ts < oldest) oldest = entry.ts;
      if (newest === null || entry.ts > newest) newest = entry.ts;
    }

    return {
      lastRefresh: oldest,
      ttl: this.CACHE_TTL,
      itemCount,
      warm:
        itemCount > 0 &&
        newest !== null &&
        Date.now() - newest < this.CACHE_TTL,
    };
  }
}
