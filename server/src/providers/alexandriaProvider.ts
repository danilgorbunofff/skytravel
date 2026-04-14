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

    if (filters.refresh) {
      this.feedCacheMap.delete(zeme);
    }

    const items = await this.getCachedFeed(zeme);

    const q = filters.q?.toLowerCase() ?? "";
    const priceMin = filters.priceMin;
    const priceMax = filters.priceMax;
    const dateStart = filters.dateStart ? new Date(filters.dateStart) : undefined;
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

    // Destination grouping
    let output: { item: AlexandriaTourInput; offersCount?: number }[];

    if (groupBy === "destination") {
      const counts = new Map<string, number>();
      const cheapest = new Map<string, AlexandriaTourInput>();
      for (const t of sorted) {
        counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1);
        const existing = cheapest.get(t.destination);
        if (!existing || t.price < existing.price) {
          cheapest.set(t.destination, t);
        }
      }
      const grouped: { item: AlexandriaTourInput; offersCount: number }[] = [];
      const seen = new Set<string>();
      for (const t of sorted) {
        if (seen.has(t.destination)) continue;
        seen.add(t.destination);
        grouped.push({
          item: cheapest.get(t.destination)!,
          offersCount: counts.get(t.destination) ?? 1,
        });
      }
      output = grouped;
    } else {
      output = sorted.map((item) => ({ item }));
    }

    // Paginate
    const filteredCount =
      groupBy === "destination" ? output.length : sorted.length;
    const totalPages = Math.ceil(output.length / limit);
    const start = (page - 1) * limit;
    const pageItems = output.slice(start, start + limit);

    return {
      total: items.length,
      filtered: filteredCount,
      uniqueDestinations,
      page,
      limit,
      totalPages,
      items: pageItems.map((entry) =>
        this.serializeItem(entry.item, entry.offersCount),
      ),
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
    const zeme =
      regionCtx.zeme !== undefined
        ? Number(regionCtx.zeme)
        : config.alexandria.country;
    const items = await this.getCachedFeed(zeme);

    const toImport = items.filter((item) => ids.includes(item.externalId));

    let created = 0;
    let updated = 0;

    for (const item of toImport) {
      const existing = item.externalId
        ? await prisma.tour.findFirst({
            where: { source: "alexandria", externalId: item.externalId },
          })
        : await prisma.tour.findFirst({
            where: {
              destination: item.destination,
              title: item.title,
              startDate: item.startDate,
            },
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
        source: "alexandria" as const,
        externalId: item.externalId || undefined,
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
    const results = await Promise.allSettled(
      KNOWN_COUNTRIES.map((c) => this.getCachedFeed(c.id)),
    );

    let total = 0;
    for (const r of results) {
      if (r.status === "fulfilled") total += r.value.length;
    }
    console.log(`[Alexandria] Cache warmed: ${total} tours across ${KNOWN_COUNTRIES.length} countries`);
  }

  async refreshCache(): Promise<void> {
    this.feedCacheMap.clear();
    this.regionsCache = null;
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
        itemCount > 0 && newest !== null && Date.now() - newest < this.CACHE_TTL,
    };
  }
}
