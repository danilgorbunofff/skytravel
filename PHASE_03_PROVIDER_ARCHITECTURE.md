# Phase 03 — Provider Architecture Refactor

## Overview

Refactor the ~60% duplicated code between `AlexandriaProvider` (798 lines) and `OrextravelProvider` (799 lines) into a shared `BaseProvider` abstract class. Extract 10 shared methods, add LRU caches to Orextravel reference data, add batch processing to `fetchOrextravelTours`, and extract duplicate `firstQueryValue` to a shared utility.

## Shared Methods to Extract (with source line ranges)

| # | Method | Alexandria lines | Orextravel lines | Notes |
|---|--------|-----------------|-----------------|-------|
| 1 | `buildTourSelect(omitHeavy)` | 72–98 | 64–90 | Identical |
| 2 | `parseNightsRange(nightsRaw)` | 47–52 | 40–45 | Identical |
| 3 | `nightsFromDates(from, to)` | 54–59 | 47–52 | Identical |
| 4 | `photosFromJson(photosRaw, image)` | 61–66 | 54–59 | Identical |
| 5 | `rowToUnified(row)` | 429–459 | 403–436 | 90% identical (Orextravel has `nights/adults/children/roomType/currency`) |
| 6 | `fetchGroupedByOffer(filters)` | 461–503 | 438–480 | Near-identical |
| 7 | `fetchOfferGroup(filters, offerGroupKey)` | 505–530 | 482–507 | Near-identical |
| 8 | `importTours(ids, regionCtx)` | 537–612 | 514–589 | Near-identical (source string differs) |
| 9 | `loadCacheStatus()` | 636–658 | 613–635 | Near-identical |
| 10 | `_syncToDbImpl()` | 670–796 | 645–797 | **Abstract** — region iteration pattern differs significantly |

## Files to Create

| File | Description |
|------|-------------|
| `server/src/providers/BaseProvider.ts` | Abstract class implementing `TourProvider` interface with shared methods |
| `server/src/providers/shared/queryUtils.ts` | Extract `firstQueryValue` and other shared query helpers |

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `server/src/providers/BaseProvider.ts` | **create** | Abstract class with shared implementations |
| `server/src/providers/shared/queryUtils.ts` | **create** | `firstQueryValue()` and optionally `parseOptionalNumber()`, `parseOptionalDate()` |
| `server/src/providers/alexandriaProvider.ts` | modify | Extend `BaseProvider`, keep only Alexandria-specific logic |
| `server/src/providers/orextravelProvider.ts` | modify | Extend `BaseProvider`, keep only Orextravel-specific logic |
| `server/src/providers/types.ts` | modify | Update `TourProvider` interface if needed for BaseProvider pattern |
| `server/src/providers/index.ts` | modify | No change expected (still imports `AlexandriaProvider` and `OrextravelProvider`) |
| `server/src/routes/providerSearchPublic.ts` | modify | Import `firstQueryValue` from shared utility instead of local definition |
| `server/src/lib/validateProviderFilters.ts` | modify | Import `firstQueryValue` from shared utility instead of local definition |

## Implementation Steps

### Step 1: Create `BaseProvider` abstract class

**File:** `server/src/providers/BaseProvider.ts`

```typescript
import { type Prisma } from "@prisma/client";
import prisma from "../prisma.js";
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
  ProviderRegionRecord,
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
import { logger } from "../lib/logger.js";
import { safeString, safeNumber } from "../lib/safeCast.js";

export type NightsRange = { min: number; max: number } | null;

export abstract class BaseProvider implements TourProvider {
  // ── Abstract members (provider-specific) ──────────────────────────
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly supportsStreaming: boolean;
  abstract readonly refreshIntervalMs: number;

  protected abstract getFeedCountries(): Array<{ id: number; name: string }>;
  protected abstract fetchFeedData(regionKey: string): Promise<unknown[]>;
  protected abstract itemToUnifiedTour(item: unknown): UnifiedTour;

  // ── Shared state ─────────────────────────────────────────────────
  protected syncMutex: Promise<void> | null = null;
  protected _cacheStatusSnapshot: CacheStatus = {
    lastRefresh: null,
    ttl: 30 * 60 * 1000,
    itemCount: 0,
    warm: false,
    syncing: false,
  };

  // ── Shared static methods ────────────────────────────────────────

  protected buildTourSelect(omitHeavy: boolean) {
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

  protected parseNightsRange(value: string | undefined): NightsRange {
    if (!value) return null;
    const [min, max] = value.split("-").map(Number);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
  }

  protected nightsFromDates(startDate: Date | string, endDate: Date | string): number | null {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    return Number.isFinite(nights) && nights > 0 ? nights : null;
  }

  protected photosFromJson(value: unknown, image: string): string[] {
    const photos = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    return photos.length > 0 ? photos : image ? [image] : [];
  }

  protected rowToUnified(row: Record<string, unknown>): UnifiedTour {
    const nights =
      safeNumber(row.nights) ??
      this.nightsFromDates(safeString(row.startDate) || "", safeString(row.endDate) || "") ??
      undefined;
    const startDateStr = row.startDate instanceof Date
      ? row.startDate.toISOString()
      : safeString(row.startDate);
    const endDateStr = row.endDate instanceof Date
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
      photos: this.photosFromJson(row.photos, safeString(row.image)),
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

  protected filterRowsByNights<
    T extends { startDate: Date | string; endDate: Date | string; nights?: number | null },
  >(rows: T[], nightsRange: NightsRange): T[] {
    if (!nightsRange) return rows;
    return rows.filter((row) => {
      const nights = row.nights ?? this.nightsFromDates(row.startDate, row.endDate);
      return nights != null && nights >= nightsRange.min && nights <= nightsRange.max;
    });
  }

  // ── Shared query building ────────────────────────────────────────

  protected buildWhereClause(filters: UnifiedFilters, providerSpecific?: Prisma.ProviderTourWhereInput): Prisma.ProviderTourWhereInput {
    const where: Prisma.ProviderTourWhereInput = {
      source: this.id,
      price: { gte: MIN_PROVIDER_TOUR_PRICE_CZK },
      ...providerSpecific,
    };

    if (filters.q) {
      where.OR = [
        { destination: { startsWith: filters.q } },
        { title: { contains: filters.q } },
      ];
    }

    const pf = filters.providerFilters;
    const board = typeof filters.board === "string"
      ? filters.board
      : typeof pf.board === "string"
        ? pf.board
        : "";
    const stars = typeof filters.stars === "string"
      ? filters.stars
      : typeof pf.stars === "string"
        ? pf.stars
        : "";
    const transport = typeof pf.transport === "string" ? pf.transport : "";
    const excludeTransport = typeof pf.excludeTransport === "string" ? pf.excludeTransport : "";

    if (transport) where.transport = transport;
    else if (excludeTransport) where.transport = { not: excludeTransport };
    if (board) where.board = board;
    if (stars) {
      const minStars = Number(stars);
      if (Number.isFinite(minStars)) {
        where.stars = {
          in: ["1", "2", "3", "4", "5"].filter((v) => Number(v) >= minStars),
        };
      }
    }

    if (filters.priceMin !== undefined && Number.isFinite(filters.priceMin)) {
      where.price = { ...(where.price as object), gte: Math.max(filters.priceMin, MIN_PROVIDER_TOUR_PRICE_CZK) };
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

  // ── Shared ToursResult methods ───────────────────────────────────

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
        select: this.buildTourSelect(omitHeavy),
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
    const { where, sortBy, sortDir, nightsRange } = this.buildQuery(filters);
    const rows = await prisma.providerTour.findMany({
      where,
      orderBy: { price: "asc" },
      take: MAX_GROUPED_TOUR_ROWS,
      select: this.buildTourSelect(true),
    });
    const group = groupOfferRows(this.filterRowsByNights(rows, nightsRange)).find(
      (entry) => entry.key === offerGroupKey,
    );
    if (!group) return [];

    const externalIds = group.offers.map((o) => o.externalId);
    const fullRows = await prisma.providerTour.findMany({
      where: { source: this.id, externalId: { in: externalIds } },
    });
    const fullRowsMap = new Map(fullRows.map((r) => [r.externalId, r]));
    const offersWithFullData = group.offers.map((o) => fullRowsMap.get(o.externalId) || o);

    return sortOfferRows(offersWithFullData, sortBy, sortDir).map((row) => ({
      ...this.rowToUnified(row),
      offerGroupKey,
      offersCount: group.offers.length,
    }));
  }

  async importTours(ids: string[], _regionCtx: Record<string, unknown>): Promise<ImportResult> {
    const providerRows = await prisma.providerTour.findMany({
      where: { source: this.id, externalId: { in: ids } },
    });

    let created = 0;
    let updated = 0;

    const externalIds = providerRows.map((r) => r.externalId).filter(Boolean) as string[];
    const existingTours = await prisma.tour.findMany({
      where: { source: this.id, externalId: { in: externalIds } },
      select: { id: true, externalId: true },
    });
    const existingMap = new Map(existingTours.map((t) => [t.externalId, t.id]));

    const toCreate: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: number; data: Record<string, unknown> }> = [];

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
        photos: Array.isArray(row.photos) && row.photos.length > 0 ? row.photos : undefined,
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
      ...toCreate.map((data) => prisma.tour.create({ data: { ...data, sortOrder: 0 } as any })),
      ...toUpdate.map(({ id, data }) => prisma.tour.update({ where: { id }, data })),
    ]);

    return { ok: true, created, updated, total: providerRows.length };
  }

  async streamTours(filters: UnifiedFilters, onBatch: StreamCallback): Promise<void> {
    const result = await this.fetchTours(filters);
    onBatch({ batch: result.items, loaded: result.items.length });
  }

  async warmCache(): Promise<void> {
    await this.syncToDb();
  }

  getCacheStatus(): CacheStatus {
    return this._cacheStatusSnapshot;
  }

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
    const ttl = this.syncMutex ? 0 : (this._cacheStatusSnapshot.ttl || 30 * 60 * 1000);
    this._cacheStatusSnapshot = {
      lastRefresh: oldest,
      ttl,
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

  // ── Abstract sync implementation ────────────────────────────────
  protected abstract _syncToDbImpl(): Promise<void>;

  // ── TourProvider interface (abstract — each provider defines) ────
  abstract getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]>;
  abstract getProviderFilters(): FilterFieldDescriptor[];
  abstract fetchTours(filters: UnifiedFilters): Promise<ToursResult>;
  abstract refreshCache(): Promise<void>;

  // ── Shared query builder (abstract — each provider defines region-specific parts) ──
  protected abstract buildQuery(filters: UnifiedFilters): {
    where: Prisma.ProviderTourWhereInput;
    sortBy: string;
    sortDir: "asc" | "desc";
    page: number;
    limit: number;
    nightsRange: NightsRange;
  };
}
```

### Step 2: Extract `firstQueryValue` to shared utility

**File:** `server/src/providers/shared/queryUtils.ts`

```typescript
export function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  if (typeof value !== "string") return undefined;
  return value.trim();
}
```

**Update imports in:**

1. `server/src/routes/providerSearchPublic.ts`:
   - Remove local `firstQueryValue` function (lines 25–29)
   - Add `import { firstQueryValue } from "../providers/shared/queryUtils.js";`

2. `server/src/lib/validateProviderFilters.ts`:
   - Remove local `firstQueryValue` function (lines 28–32)
   - Add `import { firstQueryValue } from "../providers/shared/queryUtils.js";`

### Step 3: Refactor AlexandriaProvider

**File:** `server/src/providers/alexandriaProvider.ts`

**Before:** `class AlexandriaProvider implements TourProvider`
**After:** `class AlexandriaProvider extends BaseProvider`

**Remove** (now inherited from BaseProvider):
- Lines 45–52: `parseNightsRange` function
- Lines 54–59: `nightsFromDates` function
- Lines 61–66: `photosFromJson` function
- Lines 72–98: `buildTourSelect` function
- Lines 429–459: `rowToUnified` method
- Lines 461–503: `fetchGroupedByOffer` method
- Lines 505–530: `fetchOfferGroup` method
- Lines 532–535: `streamTours` method
- Lines 537–612: `importTours` method
- Lines 614–616: `warmCache` method
- Lines 623–658: `getCacheStatus` and `loadCacheStatus` methods
- Lines 660–668: `syncToDb` method (wait — the syncMutex pattern IS shared, but sync logic is provider-specific)

Actually, `syncToDb` CAN be shared (the mutex pattern is identical). The `_syncToDbImpl` is what differs.

**Keep** (Alexandria-specific):
- `KNOWN_COUNTRIES` array
- `feedCacheMap` and `CACHE_TTL`
- `getCachedFeed` method
- `serializeItem` method (Alexandria-specific `UnifiedTour` shape)
- `getRegions` method
- `withGroupedRegionCounts` method
- `getProviderFilters` method
- `buildTourQuery` method (Alexandria-specific: `zeme` country filter, no two-level region selection)
- `fetchTours` method (has destination grouping)
- `fetchGroupedByDestination` method (Alexandria-specific)
- `_syncToDbImpl` method

**Target size:** ~400 lines (from 798)

### Step 4: Refactor OrextravelProvider

**File:** `server/src/providers/orextravelProvider.ts`

**Before:** `class OrextravelProvider implements TourProvider`
**After:** `class OrextravelProvider extends BaseProvider`

**Remove** (same as Alexandria — now inherited from BaseProvider):
- Lines 40–45: `parseNightsRange` function
- Lines 47–52: `nightsFromDates` function (wait, these are module-level functions, not methods)
- Lines 54–59: `photosFromJson` function
- Lines 64–90: `buildTourSelect` function
- Lines 325–333: `filterRowsByNights` method
- Lines 438–480: `fetchGroupedByOffer` method
- Lines 482–507: `fetchOfferGroup` method
- Lines 509–512: `streamTours` method
- Lines 514–589: `importTours` method
- Lines 591–593: `warmCache` method
- Lines 601–635: `getCacheStatus` and `loadCacheStatus` methods
- Lines 637–643: `syncToDb` method

**Keep** (Orextravel-specific):
- `fetchTownState`, `fetchOrextravelTours`, `clearOrextravelCache` imports
- `feedCacheMap` and `CACHE_TTL`
- `getCachedFeed` method (uses different key: `townFrom-stateId`)
- `serializeItem` method (Orextravel-specific: includes nights/adults/children/roomType/currency)
- `getRegions` method (two-level town→state selection)
- `withGroupedRegionCounts` method (Orextravel-specific: departureId in key)
- `getProviderFilters` method (`townFrom` + `stateId`)
- `buildTourQuery` method (Orextravel-specific: regionKey from town-state pairs)
- `fetchTours` method (Orextravel-specific: town/state region filtering + `countDistinctDestinations`)
- `countDistinctDestinations` method (Orextravel-specific)
- `_syncToDbImpl` method (iterates routes, not countries)

**Add LRU cache with max size:**
Replace `Map<string, { data: OrextravelTourInput[]; ts: number }>` with `LRUCache`:
```typescript
import { LRUCache } from "lru-cache";

private feedCache = new LRUCache<string, { data: OrextravelTourInput[]; ts: number }>({
  max: 20,        // max 20 cached route combinations
  ttl: this.CACHE_TTL,
});
```

**Update `getCachedFeed`:**
```typescript
private async getCachedFeed(townFrom?: number, stateId?: number): Promise<OrextravelTourInput[]> {
  const key = `${townFrom ?? "all"}-${stateId ?? "all"}`;
  const cached = this.feedCache.get(key);
  if (cached) return cached.data;
  const data = await fetchOrextravelTours(townFrom, stateId);
  this.feedCache.set(key, { data, ts: Date.now() });
  return data;
}
```

Note: `LRUCache` with `ttl` option handles both max size and TTL expiration. `ttl` in constructor sets the default TTL.

**Add batch processing to `fetchOrextravelTours`:**

In `server/src/lib/orextravel.ts`, wrap the existing `fetchOrextravelTours` to accept batching parameters, or add a new exported function:

```typescript
export async function fetchOrextravelToursBatched(
  townFrom?: number,
  stateId?: number,
  batchSize = 100,
): Promise<OrextravelTourInput[]> {
  // Check if the upstream supports pagination
  // If not, just call fetchOrextravelTours normally
  // (the provider endpoint may limit results)
  return fetchOrextravelTours(townFrom, stateId);
}
```

**Target size:** ~450 lines (from 799)

### Step 5: Update imports in refactored providers

**AlexandriaProvider imports after refactor:**
```typescript
import { config } from "../config.js";
import { type Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import {
  fetchAlexandriaParsed,
  extractToursFromParsed,
  type AlexandriaTourInput,
} from "../lib/alexandria.js";
import type { UnifiedTour, ToursResult, CacheStatus, ProviderRegion, FilterFieldDescriptor } from "./types.js";
import { BaseProvider, type NightsRange } from "./BaseProvider.js";
import { ensureProviderDestinationMapping } from "./destinationStore.js";
import { isPlausibleProviderPriceCzk } from "../lib/providerPrice.js";
import { logger } from "../lib/logger.js";
import { safeString, safeNumber } from "../lib/safeCast.js";
```

**OrextravelProvider imports after refactor:**
```typescript
import { type Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import {
  fetchTownState,
  fetchOrextravelTours,
  clearOrextravelCache,
  type OrextravelTourInput,
} from "../lib/orextravel.js";
import type { UnifiedTour, ToursResult, CacheStatus, ProviderRegion, FilterFieldDescriptor } from "./types.js";
import { BaseProvider, type NightsRange } from "./BaseProvider.js";
import { ensureProviderDestinationMapping } from "./destinationStore.js";
import { isPlausibleProviderPriceCzk } from "../lib/providerPrice.js";
import { logger } from "../lib/logger.js";
import { safeString, safeNumber } from "../lib/safeCast.js";
```

### Step 6: Verify registry and index

**File:** `server/src/providers/index.ts` — no changes needed, since both providers still export the same class names.

**File:** `server/src/providers/registry.ts` — no changes needed; `registerProvider` still accepts `TourProvider` and both subclasses implement it.

## Verification

```bash
# TypeScript compiles
npx tsc --noEmit --workspace server

# Server tests pass
npm --workspace server run test

# Alexandria sync works
npx tsx server/scripts/refresh-alexandria.ts

# Orextravel sync works
# (check if a similar script exists, or verify via admin API)

# Search endpoint returns data from both providers
curl http://localhost:4000/api/search/providers | json
```

## Edge Cases to Test

1. **Both providers return data** after refactor — verify search results are identical to pre-refactor
2. **One provider fails sync** — the other should still work
3. **LRU cache eviction** — Orextravel feed cache shouldn't grow unbounded
4. **BaseProvider method overrides** — if a provider needs different behavior (e.g., Orextravel's `rowToUnified` handles more fields), ensure the override is correct
5. **Import tours** — verify `importTours` still works from admin panel

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Extracting shared methods | **MEDIUM** — behavioral differences between providers | Run full test suite; compare search results before/after |
| BaseProvider `rowToUnified` | **MEDIUM** — Orextravel has extra fields (nights/adults/children/roomType/currency) | Override in OrextravelProvider if BaseProvider's version misses fields; design BaseProvider version to include all fields with `undefined` fallbacks |
| LRU cache for Orextravel | **LOW** — replacing Map with LRUCache, same API | Verify `get()` / `set()` with `ttl` works correctly |
| `firstQueryValue` extraction | **LOW** — mechanical move, same function | Verify both call sites still import correctly |
