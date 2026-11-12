// ──────────────────────────────────────────────
// Alexandria Provider
// ──────────────────────────────────────────────

import { config } from "../config.js";
import { type Prisma } from "../generated/prisma/client/client.js";
import prisma from "../prisma.js";
import {
  fetchAlexandriaParsed,
  extractToursFromParsed,
  type AlexandriaTourInput,
} from "../lib/alexandria.js";
import type {
  UnifiedTour,
  UnifiedFilters,
  ToursResult,
  ProviderRegion,
  FilterFieldDescriptor,
} from "./types.js";
import { readRegions, writeRegions, updateRegionTourCount } from "./regionStore.js";
import { countOfferGroupsBy } from "./offerGrouping.js";
import { invalidatePublicSearchCache } from "./publicSearchCache.js";
import { ensureProviderDestinationMapping } from "./destinationStore.js";
import { isPlausibleProviderPriceCzk } from "../lib/providerPrice.js";
import { logger } from "../lib/logger.js";
import pLimit from "p-limit";
import {
  BaseProvider,
  parseNightsRange,
  buildTourSelect,
  type TourQuery,
  type NightsRange,
} from "./BaseProvider.js";

// ── Alexandria country IDs (validated 2026-06-16 via API probe) ──────
// zeme=0 returns a 153MB global XML — use per-country requests instead.
const KNOWN_COUNTRIES: { id: number; name: string }[] = [
  { id: 53, name: "Bulharsko" },
  { id: 107, name: "Chorvatsko" },
  { id: 2338, name: "Itálie" }, // was incorrectly 147
  { id: 971, name: "Španělsko" },
  { id: 976, name: "Řecko" },
  { id: 5613, name: "Turecko" },
  { id: 10475, name: "Albánie" },
  { id: 11387, name: "Černá Hora" },
];

export class AlexandriaProvider extends BaseProvider {
  readonly id = "alexandria";
  readonly label = "Alexandria";
  readonly supportsStreaming = false;
  readonly refreshIntervalMs = 25 * 60 * 1000; // 25 min

  private feedCacheMap = new Map<number, { data: AlexandriaTourInput[]; ts: number }>();

  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 min

  // ── Private helpers ───────────────────────────────────────────────

  private async getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
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

  private serializeItem(item: AlexandriaTourInput, offersCount?: number): UnifiedTour {
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

  // ── Abstract method implementations ───────────────────────────────

  async getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]> {
    // Fast path: read from DB (with 5-min in-process L1 cache)
    const fromDb = await readRegions(this.id);
    if (fromDb.length > 0) return this.withGroupedRegionCounts(fromDb, filters);

    // Fallback (cold DB) — return the static known list with no counts so
    // the UI can render immediately while the background sync populates DB.
    return KNOWN_COUNTRIES.map((c) => ({ id: c.id, name: c.name })).sort((a, b) =>
      a.name.localeCompare(b.name, "cs"),
    );
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

  protected buildQuery(filters: UnifiedFilters): TourQuery {
    const pf = filters.providerFilters;
    const zeme = pf.zeme !== undefined ? Number(pf.zeme) : undefined;
    const nightsRange = parseNightsRange(filters.nights);

    const sortBy = filters.sortBy ?? "price";
    const sortDir = filters.sortDir ?? "asc";
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(1_000, Math.max(1, filters.limit ?? 50));

    // Build shared Prisma WHERE clause and add Alexandria-specific region filter
    const where = this.buildWhereClause(filters);
    if (zeme !== undefined && Number.isFinite(zeme)) {
      where.regionKey = String(zeme);
    }

    return { where, sortBy, sortDir, page, limit, nightsRange };
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    const { where, sortBy, sortDir, page, limit, nightsRange } = this.buildQuery(filters);
    const groupBy =
      typeof filters.providerFilters.groupBy === "string" ? filters.providerFilters.groupBy : "";
    const omitHeavy = filters.omitHeavy === true;

    if (filters.groupResults) {
      return this.fetchGroupedByOffer(where, sortBy, sortDir, page, limit, nightsRange, omitHeavy);
    }

    // Destination grouping — uses in-memory aggregation of DB results
    if (groupBy === "destination") {
      return this.fetchGroupedByDestination(
        where,
        sortBy,
        sortDir,
        page,
        limit,
        omitHeavy,
        nightsRange,
      );
    }

    const orderBy: Prisma.ProviderTourOrderByWithRelationInput =
      sortBy === "date" ? { startDate: sortDir } : { price: sortDir };

    const hasTextFilter = Boolean(filters.q);
    const hasPriceFilter = filters.priceMin !== undefined || filters.priceMax !== undefined;
    const hasDateFilter = filters.dateStart !== undefined || filters.dateEnd !== undefined;
    const needsSeparateTotal = hasTextFilter || hasPriceFilter || hasDateFilter;

    // When nights filter is active, we must fetch all rows and filter in memory
    // (since nights may be NULL in DB and need computation from dates)
    const allRows = nightsRange
      ? await prisma.providerTour.findMany({
          where,
          orderBy,
          select: buildTourSelect(omitHeavy),
          take: 5_000,
        })
      : null;

    const [items, filtered, rawTotal, uniqueDestinations] = await Promise.all([
      nightsRange
        ? Promise.resolve([]) // handled below
        : prisma.providerTour.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            select: buildTourSelect(omitHeavy),
          }),
      nightsRange
        ? Promise.resolve(0) // handled below
        : prisma.providerTour.count({ where }),
      needsSeparateTotal
        ? prisma.providerTour.count({
            where: { source: this.id, ...(where.regionKey ? { regionKey: where.regionKey } : {}) },
          })
        : Promise.resolve(null),
      // Region count is derived from the persisted region list, not a
      // distinct scan over ProviderTour. For Alexandria each regionKey is a
      // country and a country == one destination from the user's POV, so the
      // number of matching regions == number of destinations.
      where.regionKey
        ? Promise.resolve(1)
        : prisma.providerRegion.count({ where: { providerId: this.id } }),
    ]);

    let finalItems: Array<(typeof items)[0]>;
    let finalFiltered: number;
    if (nightsRange && allRows) {
      const filteredRows = this.filterRowsByNights(allRows, nightsRange);
      finalFiltered = filteredRows.length;
      const start = (page - 1) * limit;
      finalItems = filteredRows.slice(start, start + limit);
    } else {
      finalItems = items;
      finalFiltered = filtered;
    }

    const total = rawTotal ?? finalFiltered;
    const totalPages = Math.ceil(finalFiltered / limit);

    return {
      total,
      filtered: finalFiltered,
      uniqueDestinations,
      page,
      limit,
      totalPages,
      items: finalItems.map((row) => this.rowToUnified(row)),
    };
  }

  private async fetchGroupedByDestination(
    where: Prisma.ProviderTourWhereInput,
    sortBy: string,
    sortDir: string,
    page: number,
    limit: number,
    omitHeavy = false,
    nightsRange?: NightsRange,
  ): Promise<ToursResult> {
    // Get grouped counts + cheapest per destination
    const allFiltered = await prisma.providerTour.findMany({
      where,
      orderBy: { price: "asc" },
      take: 5_000, // hard cap — Alexandria rarely exceeds this
      select: buildTourSelect(omitHeavy),
    });

    // Apply nights filter in memory (nights may be NULL in DB)
    const nightFiltered = this.filterRowsByNights(allFiltered, nightsRange ?? null);

    const counts = new Map<string, number>();
    const cheapest = new Map<string, (typeof allFiltered)[0]>();
    for (const t of nightFiltered) {
      counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1);
      if (!cheapest.has(t.destination)) cheapest.set(t.destination, t);
    }

    const grouped = [...cheapest.values()].map((row) => ({
      tour: this.rowToUnified(row),
      offersCount: counts.get(row.destination) ?? 1,
    }));

    // Sort the grouped results
    grouped.sort((a, b) => {
      const d =
        sortBy === "date"
          ? new Date(a.tour.startDate).getTime() - new Date(b.tour.startDate).getTime()
          : a.tour.price - b.tour.price;
      return sortDir === "asc" ? d : -d;
    });

    const total = nightFiltered.length;
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

  async refreshCache(): Promise<void> {
    this.feedCacheMap.clear();
    await this.syncToDb();
  }

  protected async _syncToDbImpl(): Promise<void> {
    // Persist the static region list up front so getRegions() works even if
    // the per-country tour fetches fail.
    await writeRegions(
      this.id,
      KNOWN_COUNTRIES.map((c) => ({
        regionKey: String(c.id),
        externalId: String(c.id),
        parentExternalId: "",
        name: c.name,
      })),
    );

    const limit = pLimit(3);
    await Promise.allSettled(
      KNOWN_COUNTRIES.map((country) =>
        limit(async () => {
          const regionKey = String(country.id);
          await prisma.providerSync.upsert({
            where: { providerId_regionKey: { providerId: this.id, regionKey } },
            create: { providerId: this.id, regionKey, status: "syncing" },
            update: { status: "syncing", errorMessage: null },
          });

          try {
            const parsed = await fetchAlexandriaParsed(country.id);
            const items = extractToursFromParsed(parsed);
            const destinationId = await ensureProviderDestinationMapping({
              providerId: this.id,
              providerKey: "zeme",
              providerValue: regionKey,
              providerLabel: country.name,
            });

            // Upsert in batches
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
                      destinationId,
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
                      destinationId,
                      syncedAt: new Date(),
                    },
                  }),
                ),
              );
            }

            // Delete stale rows for this region — also when the feed is
            // valid but empty, otherwise removed hotels linger forever.
            await prisma.providerTour.deleteMany({
              where: {
                source: this.id,
                regionKey,
                externalId: { notIn: [...seenIds] },
              },
            });

            const count = await prisma.providerTour.count({
              where: { source: this.id, regionKey },
            });

            await prisma.providerSync.update({
              where: { providerId_regionKey: { providerId: this.id, regionKey } },
              data: { status: "idle", lastSyncAt: new Date(), itemCount: count },
            });
            await updateRegionTourCount(this.id, regionKey, count);

            logger.info(
              `[Alexandria] Synced ${count} tours for country ${country.name} (${country.id})`,
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await prisma.providerSync.update({
              where: { providerId_regionKey: { providerId: this.id, regionKey } },
              data: { status: "error", errorMessage: msg },
            });
            logger.error({ err }, `[Alexandria] Sync failed for country ${country.name}`);
          }
        }),
      ),
    );
    await this.loadCacheStatus();
    invalidatePublicSearchCache(this.id);
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
    return regions.map((region) => ({
      ...region,
      count: counts.get(String(region.id)) ?? undefined,
    }));
  }
}
