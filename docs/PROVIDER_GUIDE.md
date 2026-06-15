# Provider Development Guide

SkyTravel aggregates tours from external travel providers. Each provider is encapsulated behind the `TourProvider` interface — this guide explains how to add a new one.

---

## TourProvider Interface

Every provider must implement the `TourProvider` interface from `server/src/providers/types.ts`:

```typescript
interface TourProvider {
  readonly id: string;                  // Unique provider key (e.g., "alexandria")
  readonly label: string;               // Human-readable name (e.g., "Alexandria")
  readonly supportsStreaming: boolean;  // SSE streaming support
  readonly refreshIntervalMs: number;   // Background refresh interval

  getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]>;
  getProviderFilters(): FilterFieldDescriptor[];
  fetchTours(filters: UnifiedFilters): Promise<ToursResult>;
  fetchOfferGroup(filters: UnifiedFilters, offerGroupKey: string): Promise<UnifiedTour[]>;
  streamTours(filters: UnifiedFilters, onBatch: StreamCallback): Promise<void>;
  importTours(ids: string[], regionCtx: Record<string, unknown>): Promise<ImportResult>;
  warmCache(): Promise<void>;
  refreshCache(): Promise<void>;
  getCacheStatus(): CacheStatus;
  syncToDb(): Promise<void>;
}
```

You don't need to implement every method from scratch. The `BaseProvider` abstract class (`server/src/providers/BaseProvider.ts`) provides shared implementations for:
- `syncToDb()` — per-instance mutex, delegates to `_syncToDbImpl()`
- `fetchOfferGroup()` — returns all offers in a group by key
- `streamTours()` — default paginated batch delivery
- `warmCache()` — delegates to `syncToDb()`
- `getCacheStatus()` — returns the `_cacheStatusSnapshot`
- `importTours()` — upserts ProviderTour rows into the public Tour table
- `buildWhereClause()` — shared Prisma WHERE generation
- `fetchGroupedByOffer()` — grouped/merged offer search
- `rowToUnified()` — DB row → UnifiedTour conversion

---

## Step-by-Step: Adding a New Provider

### 1. Create the provider file

```
server/src/providers/newProvider.ts
```

### 2. Implement the provider

Extend `BaseProvider` and implement the required abstract members:

```typescript
// server/src/providers/newProvider.ts
import { BaseProvider, type TourQuery } from "./BaseProvider.js";
import type {
  UnifiedFilters, ToursResult, ProviderRegion, FilterFieldDescriptor,
} from "./types.js";

export class NewProvider extends BaseProvider {
  readonly id = "new-provider";
  readonly label = "New Provider";
  readonly supportsStreaming = false;
  readonly refreshIntervalMs = 30 * 60 * 1000; // 30 min

  getProviderFilters(): FilterFieldDescriptor[] {
    return [
      {
        key: "category",
        label: "Category",
        type: "select",
        options: [{ value: "1", label: "All Inclusive" }],
      },
    ];
  }

  async getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]> {
    // Return available destination regions
    // Usually fetched from the external API or read from DB
    const regions = await fetchRegionsFromApi();
    return regions.map((r) => ({ id: r.id, name: r.name }));
  }

  protected buildQuery(filters: UnifiedFilters): TourQuery {
    // Build Prisma query for fetching tours from ProviderTour table
    const where = this.buildWhereClause(filters);
    // Add provider-specific region filtering based on filters.providerFilters
    return {
      where,
      sortBy: "price",
      sortDir: "asc",
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      nightsRange: null,
    };
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    if (filters.groupResults) {
      // Grouped search (dedup by title+destination)
      const query = this.buildQuery(filters);
      return this.fetchGroupedByOffer(
        query.where, query.sortBy, query.sortDir,
        query.page, query.limit, query.nightsRange,
        filters.omitHeavy,
      );
    }
    // Ungrouped search (individual offers)
    const query = this.buildQuery(filters);
    const [rows, total] = await Promise.all([
      prisma.providerTour.findMany({ where: query.where, /* ... */ }),
      prisma.providerTour.count({ where: query.where }),
    ]);
    return {
      total, filtered: total, page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      items: rows.map((r) => this.rowToUnified(r)),
    };
  }

  protected async _syncToDbImpl(): Promise<void> {
    // 1. Fetch data from external API
    const rawData = await fetch(this.config.url, {
      headers: { Authorization: `Bearer ${this.config.token}` },
    });
    const tours = parseApiResponse(rawData); // -> UnifiedTour[]

    // 2. Upsert into ProviderTour table
    for (const tour of tours) {
      await prisma.providerTour.upsert({
        where: { source_externalId: { source: this.id, externalId: tour.externalId } },
        create: { /* map tour fields */ },
        update: { /* map tour fields */ },
      });
    }

    // 3. Update sync status
    await prisma.providerSync.upsert({
      where: { providerId_regionKey: { providerId: this.id, regionKey: "all" } },
      create: { providerId: this.id, regionKey: "all", status: "idle", itemCount: tours.length },
      update: { status: "idle", itemCount: tours.length, lastSyncAt: new Date() },
    });

    // 4. Update cache status
    this._cacheStatusSnapshot = {
      lastRefresh: Date.now(),
      ttl: this.refreshIntervalMs,
      itemCount: tours.length,
      warm: true,
      syncing: false,
    };
  }
}
```

### 3. Register in the registry

Edit `server/src/providers/index.ts`:

```typescript
import { registerProvider } from "./registry.js";
import { AlexandriaProvider } from "./alexandriaProvider.js";
import { OrextravelProvider } from "./orextravelProvider.js";
import { NewProvider } from "./newProvider.js";           // ← ADD

registerProvider(new AlexandriaProvider());
registerProvider(new OrextravelProvider());
registerProvider(new NewProvider());                      // ← ADD

export * from "./types.js";
export { registerProvider, getProvider, getAllProviders } from "./registry.js";
```

The registry is a singleton `Map<string, TourProvider>`. Registration happens at module import time. Duplicate registration throws an error.

### 4. Add config/env vars

Add provider config to `server/src/config.ts`:

```typescript
newProvider: {
  url: process.env.NEW_PROVIDER_URL || "",
  token: process.env.NEW_PROVIDER_TOKEN || "",
},
```

Add env vars to `server/.env.example`:

```env
# ─── New Provider ─────────────────────────────────────
NEW_PROVIDER_URL=https://api.newprovider.com/v1
NEW_PROVIDER_TOKEN=
```

### 5. Add destination mappings

Destinations are countries (not cities or hotels). Mapping is defined in `server/src/providers/destinationStore.ts` in the `KNOWN_DESTINATIONS` array:

```typescript
{
  slug: "egypt",
  czechName: "Egypt",
  canonicalName: "Egypt",
  aliases: ["egypt"],
  mappings: [
    {
      providerId: "new-provider",
      providerKey: "countryId",
      providerValue: "42",
      providerLabel: "Egypt",
    },
  ],
},
```

Or add mappings dynamically at runtime via `ensureProviderDestinationMapping()`.

### 6. Test

```bash
# Run server tests
npm --workspace server run test

# Run provider-specific tests
npm --workspace server run test -- --test-name-pattern="NewProvider"
```

---

## Region / Destination Mapping

### Destinations are countries only

The system has ~16 known destinations, all countries:
Bulharsko, Chorvatsko, Egypt, Itálie, Tunisko, Řecko, Turecko, Kypr, Španělsko, Thajsko, Madagaskar, Dominikánská republika, Portugalsko, Indie, Maledivy, SAE

There are **no** city-level, resort-level, or hotel-level destinations.

### Two-level provider mapping

Alexandria uses a single-level region system (`zeme` = country ID):

```
Alexandria regionKey: "53" → Destination: Bulharsko
Alexandria regionKey: "107" → Destination: Chorvatsko
```

Orextravel uses a two-level system (stateId → regionKey):

```
Orextravel stateId: 17 → Destination: Bulharsko
Orextravel stateId: 16 → Destination: Řecko
```

When adding a new provider, add both the `Destination` entry and the `DestinationMapping` entries. If you use a different key naming convention than the existing providers, ensure `moveProviderToursForMapping()` in `destinationStore.ts` handles it.

---

## Offer Grouping Utilities

The `offerGrouping.ts` module provides utilities for deduplicating tours:

| Function | Purpose |
|---|---|
| `buildOfferGroupKey(row)` | Creates a normalized key from `source + title + destination` |
| `groupOfferRows(rows)` | Groups rows by key, picks best representative (lowest price, then earliest date) |
| `countOfferGroupsBy(rows, getBucketKey)` | Counts distinct groups per bucket |
| `sortOfferGroups(groups, sortBy, sortDir)` | Sorts groups by price or date |
| `sortOfferRows(rows, sortBy, sortDir)` | Sorts individual rows by price or date |
| `normalizeOfferText(value)` | Strip diacritics, lowercase, collapse whitespace |

Use `this.fetchGroupedByOffer()` from `BaseProvider` if you want standard grouping behavior. Set `filters.groupResults = true` to enable grouping in search.

---

## Testing with a Mock Provider

Use the existing test fixtures as reference. Test files for providers live next to the implementation:

```
server/src/providers/__fixtures__/  ← test data
server/src/providers/alexandriaProvider.test.ts
server/src/providers/orextravelProvider.test.ts
```

To test a new provider:

```typescript
// newProvider.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { NewProvider } from "./newProvider.js";

describe("NewProvider", () => {
  let provider: NewProvider;

  before(() => {
    provider = new NewProvider();
  });

  it("returns provider metadata", () => {
    assert.equal(provider.id, "new-provider");
    assert.equal(typeof provider.label, "string");
  });

  it("registers filter fields", () => {
    const filters = provider.getProviderFilters();
    assert.ok(Array.isArray(filters));
  });
});
```

Tests need a running MySQL database (`skytravel_test`). Set up:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS skytravel_test"
DATABASE_URL=mysql://root:password@localhost:3306/skytravel_test npm --workspace server run test
```

---

## Example Provider Skeleton

Minimal implementation for a new provider:

```typescript
// server/src/providers/myProvider.ts
import { BaseProvider, type TourQuery } from "./BaseProvider.js";
import prisma from "../prisma.js";
import type {
  UnifiedFilters, ToursResult, ProviderRegion, FilterFieldDescriptor,
} from "./types.js";

export class MyProvider extends BaseProvider {
  readonly id = "my-provider";
  readonly label = "My Provider";
  readonly supportsStreaming = false;
  readonly refreshIntervalMs = 60 * 60 * 1000; // 1 hour

  getProviderFilters(): FilterFieldDescriptor[] {
    return [];
  }

  async getRegions(_filters?: UnifiedFilters): Promise<ProviderRegion[]> {
    return [];
  }

  protected buildQuery(filters: UnifiedFilters): TourQuery {
    return {
      where: { ...this.buildWhereClause(filters), source: this.id },
      sortBy: "price",
      sortDir: "asc",
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      nightsRange: null,
    };
  }

  async fetchTours(filters: UnifiedFilters): Promise<ToursResult> {
    if (filters.groupResults) {
      const q = this.buildQuery(filters);
      return this.fetchGroupedByOffer(q.where, q.sortBy, q.sortDir, q.page, q.limit, q.nightsRange, filters.omitHeavy);
    }
    const q = this.buildQuery(filters);
    const [rows, total] = await Promise.all([
      prisma.providerTour.findMany({ where: q.where, orderBy: { price: "asc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
      prisma.providerTour.count({ where: q.where }),
    ]);
    return {
      total, filtered: total, page: q.page, limit: q.limit,
      totalPages: Math.ceil(total / q.limit),
      items: rows.map((r) => this.rowToUnified(r)),
      uniqueDestinations: 0,
    };
  }

  protected async _syncToDbImpl(): Promise<void> {
    // TODO: fetch from external API, parse, upsert into ProviderTour
    this._cacheStatusSnapshot = { lastRefresh: Date.now(), ttl: this.refreshIntervalMs, itemCount: 0, warm: true, syncing: false };
  }
}
```

---

## Existing Providers Reference

| Provider | ID | Data Format | Auth | Regions | Cache |
|---|---|---|---|---|---|
| **Alexandria** | `alexandria` | XML export feed | API key (query param) | Single-level (`zeme` ID) | LRU, warmed on startup |
| **Orextravel** | `orextravel` | JSON REST | Bearer token (header) | Two-level (stateId → region) | LRU, stale-while-revalidate |

See `server/src/providers/alexandriaProvider.ts` and `orextravelProvider.ts` for full implementations.
