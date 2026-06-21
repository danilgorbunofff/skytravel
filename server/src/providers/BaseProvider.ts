// ──────────────────────────────────────────────
// BaseProvider — abstract class for all tour providers.
// Extracting ~60% duplicated code from AlexandriaProvider
// into a shared base.
// ──────────────────────────────────────────────

import { type Prisma } from "../generated/prisma/client/client.js";
import prisma from "../prisma.js";
import type {
  UnifiedTour,
  UnifiedFilters,
  ToursResult,
  ImportResult,
  CacheStatus,
  StreamCallback,
  ProviderRegion,
  FilterFieldDescriptor,
  TourProvider,
} from "./types.js";
import {
  countOfferGroupsBy,
  groupOfferRows,
  MAX_GROUPED_TOUR_ROWS,
  sortOfferGroups,
  sortOfferRows,
} from "./offerGrouping.js";
import { MIN_PROVIDER_TOUR_PRICE_CZK } from "../lib/providerPrice.js";
import { safeString, safeNumber } from "../lib/safeCast.js";

// ── Shared types ──────────────────────────────────────

export type NightsRange = { min: number; max: number } | null;

export type TourQuery = {
  where: Prisma.ProviderTourWhereInput;
  sortBy: string;
  sortDir: "asc" | "desc";
  page: number;
  limit: number;
  nightsRange: NightsRange;
};

// ── Shared static helpers ─────────────────────────────

export function parseNightsRange(value: string | undefined): NightsRange {
  if (!value) return null;
  const [min, max] = value.split("-").map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export function nightsFromDates(
  startDate: Date | string,
  endDate: Date | string,
): number | null {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : null;
}

export function photosFromJson(value: unknown, image: string): string[] {
  const photos = Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    : [];
  return photos.length > 0 ? photos : image ? [image] : [];
}

export function buildTourSelect(omitHeavy: boolean) {
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

// ── Abstract base class ───────────────────────────────

export abstract class BaseProvider implements TourProvider {
  // ── Abstract members (provider-specific) ────────────
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly supportsStreaming: boolean;
  abstract readonly refreshIntervalMs: number;

  // ── Shared state ────────────────────────────────────
  protected syncMutex: Promise<void> | null = null;
  protected _cacheStatusSnapshot: CacheStatus = {
    lastRefresh: null,
    ttl: 30 * 60 * 1000,
    itemCount: 0,
    warm: false,
    syncing: false,
  };

  // ── Abstract methods (provider-specific) ────────────
  abstract getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]>;
  abstract getProviderFilters(): FilterFieldDescriptor[];
  abstract fetchTours(filters: UnifiedFilters): Promise<ToursResult>;
  abstract refreshCache(): Promise<void>;
  protected abstract _syncToDbImpl(): Promise<void>;
  protected abstract buildQuery(filters: UnifiedFilters): TourQuery;

  // ── Shared concrete methods ─────────────────────────

  /**
   * Filter rows by nights range, computing nights from dates when needed.
   */
  protected filterRowsByNights<
    T extends {
      startDate: Date | string;
      endDate: Date | string;
      nights?: number | null;
    },
  >(rows: T[], nightsRange: NightsRange): T[] {
    if (!nightsRange) return rows;
    return rows.filter((row) => {
      const nights =
        row.nights ?? nightsFromDates(row.startDate, row.endDate);
      return (
        nights != null &&
        nights >= nightsRange.min &&
        nights <= nightsRange.max
      );
    });
  }

  /**
   * Convert a DB row (Record) into a UnifiedTour.
   * Includes provider-specific fields (nights, adults, children,
   * roomType, currency) with undefined fallbacks so subclasses can
   * override with real values.
   */
  protected rowToUnified(row: Record<string, unknown>): UnifiedTour {
    const nights =
      safeNumber(row.nights) ??
      nightsFromDates(
        safeString(row.startDate) || "",
        safeString(row.endDate) || "",
      ) ??
      undefined;
    const startDateStr =
      row.startDate instanceof Date
        ? row.startDate.toISOString()
        : safeString(row.startDate);
    const endDateStr =
      row.endDate instanceof Date
        ? row.endDate.toISOString()
        : safeString(row.endDate);
    return {
      externalId: safeString(row.externalId, "unknown"),
      destination: safeString(row.destination, "unknown"),
      title: safeString(row.title, "unknown"),
      price: safeNumber(row.price) ?? 0,
      originalPrice: safeNumber(row.originalPrice) ?? 0,
      startDate: startDateStr,
      endDate: endDateStr,
      transport: safeString(row.transport),
      image: safeString(row.image),
      description: safeString(row.description) || null,
      photos: photosFromJson(row.photos, safeString(row.image)),
      url: safeString(row.url),
      stars: safeString(row.stars),
      board: safeString(row.board),
      source: this.id,
      offersCount: safeNumber(row.offersCount),
      nights,
      adults: safeNumber(row.adults),
      children: safeNumber(row.children),
      roomType: safeString(row.roomType) || undefined,
      currency: safeString(row.currency) || undefined,
    };
  }

  /**
   * Build the shared Prisma WHERE clause from filters.
   * Handles: source, price floor, text search (q), transport, board,
   * stars, priceMin/priceMax, dateStart/dateEnd.
   *
   * Returns a base where that subclasses extend with provider-specific
   * region filtering in their `buildQuery` override.
   */
  protected buildWhereClause(
    filters: UnifiedFilters,
  ): Prisma.ProviderTourWhereInput {
    const pf = filters.providerFilters;
    const transport = typeof pf.transport === "string" ? pf.transport : "";
    const boardArr: string[] =
      Array.isArray(filters.board) ? filters.board :
      typeof filters.board === "string" ? filters.board.split(",").filter(Boolean) :
      Array.isArray(pf.board) ? pf.board :
      typeof pf.board === "string" ? pf.board.split(",").filter(Boolean) :
      [];
    const stars =
      typeof filters.stars === "string"
        ? filters.stars
        : typeof pf.stars === "string"
          ? pf.stars
          : "";
    const excludeTransport =
      typeof pf.excludeTransport === "string" ? pf.excludeTransport : "";

    const where: Prisma.ProviderTourWhereInput = {
      source: this.id,
      price: { gte: MIN_PROVIDER_TOUR_PRICE_CZK },
    };

    if (filters.q) {
      const q = filters.q;
      where.OR = [
        { destination: { startsWith: q } },
        { title: { contains: q } },
      ];
    }

    if (transport) where.transport = transport;
    else if (excludeTransport) where.transport = { not: excludeTransport };
    if (boardArr.length === 1) {
      where.board = boardArr[0];
    } else if (boardArr.length > 1) {
      where.board = { in: boardArr };
    }
    if (stars) {
      const minStars = Number(stars);
      if (Number.isFinite(minStars)) {
        where.stars = {
          in: ["1", "2", "3", "4", "5"].filter(
            (value) => Number(value) >= minStars,
          ),
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
      const ds = new Date(`${filters.dateStart}T00:00:00.000Z`);
      if (!Number.isNaN(ds.getTime())) {
        where.startDate = { ...(where.startDate as object), gte: ds };
      }
    }
    if (filters.dateEnd) {
      const de = new Date(`${filters.dateEnd}T00:00:00.000Z`);
      if (!Number.isNaN(de.getTime())) {
        where.endDate = { ...(where.endDate as object), lte: de };
      }
    }

    return where;
  }

  /**
   * Fetch tours grouped by offer (title+destionation dedup).
   * Called from fetchTours when filters.groupResults is true.
   */
  protected async fetchGroupedByOffer(
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
    const rawFilteredOffers = nightsRange
      ? filteredRows.length
      : rawFilteredDb;
    const grouped = sortOfferGroups(
      groupOfferRows(filteredRows),
      sortBy,
      sortDir,
    );
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

  /**
   * Fetch all offers belonging to a single offer group.
   */
  async fetchOfferGroup(
    filters: UnifiedFilters,
    offerGroupKey: string,
  ): Promise<UnifiedTour[]> {
    const { where, sortBy, sortDir, nightsRange } = this.buildQuery(filters);
    const rows = await prisma.providerTour.findMany({
      where,
      orderBy: { price: "asc" },
      take: MAX_GROUPED_TOUR_ROWS,
      select: buildTourSelect(true),
    });
    const group = groupOfferRows(
      this.filterRowsByNights(rows, nightsRange),
    ).find((entry) => entry.key === offerGroupKey);
    if (!group) return [];

    const externalIds = group.offers.map((o) => o.externalId);
    const fullRows = await prisma.providerTour.findMany({
      where: { source: this.id, externalId: { in: externalIds } },
    });
    const fullRowsMap = new Map(fullRows.map((r) => [r.externalId, r]));
    const offersWithFullData = group.offers.map(
      (o) => fullRowsMap.get(o.externalId) || o,
    );

    return sortOfferRows(offersWithFullData, sortBy, sortDir).map((row) => ({
      ...this.rowToUnified(row),
      offerGroupKey,
      offersCount: group.offers.length,
    }));
  }

  /**
   * Import tours from ProviderTour into the public Tour table.
   */
  async importTours(
    ids: string[],
    _regionCtx: Record<string, unknown>,
  ): Promise<ImportResult> {
    const providerRows = await prisma.providerTour.findMany({
      where: {
        source: this.id,
        externalId: { in: ids },
      },
    });

    let created = 0;
    let updated = 0;

    const externalIds = providerRows
      .map((r) => r.externalId)
      .filter(Boolean) as string[];
    const existingTours = await prisma.tour.findMany({
      where: { source: this.id, externalId: { in: externalIds } },
      select: { id: true, externalId: true },
    });
    const existingMap = new Map(existingTours.map((t) => [t.externalId, t.id]));

    const toCreate: Array<{
      destination: string;
      title: string;
      price: number;
      startDate: Date;
      endDate: Date;
      transport: string;
      image: string;
      description: string | null;
      photos: Prisma.InputJsonValue | undefined;
      source: string;
      externalId: string;
    }> = [];
    const toUpdate: Array<{
      id: number;
      data: (typeof toCreate)[0];
    }> = [];

    for (const row of providerRows) {
      if (!row.externalId) continue;

      const data = {
        destination: row.destination,
        title: row.title,
        price: row.price,
        startDate: row.startDate,
        endDate: row.endDate,
        transport: row.transport,
        image: row.image,
        description: row.description,
        photos:
          Array.isArray(row.photos) && row.photos.length > 0
            ? row.photos
            : undefined,
        source: this.id,
        externalId: row.externalId,
      };

      const existingId = existingMap.get(row.externalId);
      if (existingId) {
        toUpdate.push({ id: existingId, data });
        updated++;
      } else {
        toCreate.push(data);
        created++;
      }
    }

    await Promise.all([
      ...toCreate.map((data) =>
        prisma.tour.create({
          data: { ...data, sortOrder: 0 },
        }),
      ),
      ...toUpdate.map(({ id, data }) =>
        prisma.tour.update({ where: { id }, data }),
      ),
    ]);

    return { ok: true, created, updated, total: providerRows.length };
  }

  /**
   * Stream tours via callback. Default implementation calls fetchTours
   * and delivers the whole page in one batch. Providers that support
    * true streaming override this.
   */
  async streamTours(
    filters: UnifiedFilters,
    onBatch: StreamCallback,
  ): Promise<void> {
    const result = await this.fetchTours(filters);
    onBatch({ batch: result.items, loaded: result.items.length });
  }

  /**
   * Warm the cache by running a full sync.
   */
  async warmCache(): Promise<void> {
    await this.syncToDb();
  }

  /**
   * Return a snapshot of the current cache status.
   */
  getCacheStatus(): CacheStatus {
    return this._cacheStatusSnapshot;
  }

  /**
   * Load cache status from the ProviderSync table.
   */
  protected async loadCacheStatus(): Promise<void> {
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
      ttl: 30 * 60 * 1000,
      itemCount,
      warm: itemCount > 0,
      syncing,
    };
  }

  /**
   * Per-instance mutex: callers (warmCache, refreshCache, scheduler)
   * coalesce on the same in-flight sync rather than piling on parallel
   * writes.
   *
   * Delegates to the abstract _syncToDbImpl which each provider implements.
   */
  async syncToDb(): Promise<void> {
    if (this.syncMutex) return this.syncMutex;
    this.syncMutex = this._syncToDbImpl().finally(() => {
      this.syncMutex = null;
    });
    return this.syncMutex;
  }
}
