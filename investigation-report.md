# Implementation Plan — Deep Investigation Report

## 1. Admin Provider Route (`server/src/routes/admin/providers.ts`) — 168 lines

**`SHARED_KEYS`** defined at line 12:
```ts
const SHARED_KEYS = new Set([
  "q", "priceMin", "priceMax", "dateStart", "dateEnd",
  "sortBy", "sortDir", "page", "limit", "refresh",
]);
```

**Admin bypasses validation** — The `/tours` handler (line 92-128) builds `providerFilters` by iterating `req.query` keys and taking anything NOT in `SHARED_KEYS` directly:
```ts
const providerFilters: Record<string, unknown> = {};
for (const key of Object.keys(req.query)) {
  if (!SHARED_KEYS.has(key)) {
    providerFilters[key] = req.query[key];
  }
}
```
Then constructs `UnifiedFilters` by directly casting query values (no parsing/validation of provider-specific filters). Values like `req.query.q as string` are used raw.

Routes:
- `GET /` — list providers
- `GET /bootstrap` — providers + regions
- `GET /:id/regions` — provider regions
- `GET /:id/cache-status` — cache status
- `GET /:id/tours` — search tours (NO validation of providerFilters)
- `POST /:id/import` — import tours (has body validation)
- `POST /:id/refresh` — refresh cache

## 2. Public Provider Search Route (`server/src/routes/providerSearchPublic.ts`) — 635 lines

**`SHARED_KEYS`** defined at line 19 — larger set including: `q`, `priceMin`, `priceMax`, `dateStart`, `dateEnd`, `nights`, `stars`, `board`, `adults`, `children`, `transport`, `hotelOnly`, `sortBy`, `sortDir`, `page`, `limit`, `offerGroupKey`, `destinationSlug`.

**`validateProviderFilters`** (lines 93-138) — compares query keys against `FilterFieldDescriptor[]` from the provider:
1. Skips SHARED_KEYS
2. Looks up each remaining key in `allowed` map (built from `fields`)
3. Rejects unknown keys → 400 error
4. Validates string length ≤ 120
5. For `field.type === "number"` → validates `Number.isFinite`
6. For fields with `options` → validates value is in allowed options

**`buildFilters`** (lines 140-234) — validates ALL shared filters:
- `q` max length 120
- `priceMin`/`priceMax` numeric, 0–2_000_000, `priceMin <= priceMax`
- `dateStart`/`dateEnd` YYYY-MM-DD format, valid date, `dateStart <= dateEnd`
- `nights` regex `/^\d{1,3}-\d{1,3}$/`
- `stars` regex `/^[1-5]$/`
- `board` comma-separated, each ≤ 16 chars, alphanumeric
- `adults` integer 1–9, `children` integer 0–6
- `sortBy` in `["price", "date"]`, `sortDir` in `["asc", "desc"]`
- `page` integer 1–10_000, `limit` integer 1–60
- Finally calls `validateProviderFilters` for provider-specific filters

**Key difference**: Public route validates EVERYTHING. Admin route validates NOTHING for provider filters — passes raw query values straight through.

## 3. Provider Registry (`server/src/providers/registry.ts`) — 40 lines

Simple singleton `Map<string, TourProvider>`:
- `registerProvider(provider)` — adds to map, throws on duplicate
- `getProvider(id)` — returns or throws `Unknown provider: "${id}"`
- `getAllProviders()` — returns array of metadata objects `{ id, label, supportsStreaming, filterFields, cacheStatus }`

**Registration happens in `server/src/providers/index.ts`** — barrel that imports and registers both providers:
```ts
registerProvider(new AlexandriaProvider());
registerProvider(new OrextravelProvider());
```

## 4. Logger Setup

**File**: `server/src/lib/logger.ts`
**Export**: `export const logger = pino({...})`
**Import pattern**: `import { logger } from "../../lib/logger.js"` (relative .js extension due to ESM)

Uses `pino` with `pino-pretty` in dev, JSON in prod. Has custom serializers for `err`, `req`, and redacts cookies/auth.

## 5. Provider Method Sections

### Alexandria `rowToUnified` (lines 427-452)
```ts
private rowToUnified(row: Record<string, unknown>): UnifiedTour {
  const nights = (row.nights as number | null) ??
    nightsFromDates(row.startDate as string | Date, row.endDate as string | Date) ?? undefined;
  return {
    externalId: row.externalId as string,
    destination: row.destination as string,
    title: row.title as string,
    price: row.price as number,
    originalPrice: row.originalPrice as number,
    startDate: row.startDate instanceof Date ? row.startDate.toISOString() : (row.startDate as string),
    endDate: row.endDate instanceof Date ? row.endDate.toISOString() : (row.endDate as string),
    transport: row.transport as string,
    image: row.image as string,
    description: (row.description as string) ?? null,
    photos: photosFromJson(row.photos, row.image as string),
    url: (row.url as string) ?? "",
    stars: row.stars as string,
    board: row.board as string,
    source: this.id,
    offersCount: (row.offersCount as number) ?? undefined,
    nights,
  };
}
```
**Note**: row is `Record<string, unknown>` with unsafe casts.

### Orextravel `rowToUnified` (lines 401-429)
Same pattern as Alexandria but adds: `adults`, `children`, `roomType`, `currency`.

### Alexandria `importTours` (lines 530-575)
```ts
async importTours(ids: string[], _regionCtx: Record<string, unknown>): Promise<ImportResult> {
  const providerRows = await prisma.providerTour.findMany({
    where: { source: this.id, externalId: { in: ids } },
  });
  // For each row: check existing Tour, create or update
  // Returns { ok, created, updated, total }
}
```

### Orextravel `importTours` (lines 507-550)
Same pattern as Alexandria (find in ProviderTour → create/update Tour).

### Alexandria `_syncToDbImpl` (lines 633-753)
1. Write regions for KNOWN_COUNTRIES
2. For each country: fetch via `fetchAlexandriaParsed`, upsert in batches of 100, delete stale rows
3. Update ProviderSync status per region
4. Final: `loadCacheStatus()` + `invalidatePublicSearchCache(this.id)`

### Orextravel `_syncToDbImpl` (lines 606-752)
1. Fetch routes via `fetchTownState()`
2. Write all regions
3. Group routes into `routeGroups`
4. For each route group: fetch tours via `fetchOrextravelTours`, upsert batches of 100, delete stale rows
5. Same final pattern: `loadCacheStatus()` + `invalidatePublicSearchCache(this.id)`

## 6. `fetchWithRetry.ts` (67 lines)

Full implementation with:
- Timeout via `AbortController` (default 15s)
- Exponential backoff (default 1s initial, doubled)
- Max 3 attempts
- Retries on 5xx, 429, AbortError, network errors (TypeError)
- Does NOT retry on 4xx

## 7. `orextravel.ts` delay function (lines 244-246)

```ts
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

Also has `runConcurrent` (lines 248-259) with configurable concurrency (default 6) and `DELAY_MS = 50` between requests.

## 8. `server/src/lib/` Directory Listing (14 files)

| File | Purpose |
|------|---------|
| `alexandria.ts` | Alexandria API client (fetch, parse XML) |
| `ApiError.ts` | Custom API error class |
| `ApiError.test.ts` | Tests for ApiError |
| `fetchWithRetry.ts` | Resilient HTTP fetch with retry |
| `i18n.ts` | Internationalization |
| `i18n.test.ts` | Tests for i18n |
| `logger.ts` | Pino logger setup |
| `mail.ts` | Email sending |
| `orextravel.ts` | Orextravel/SAMO API client (911 lines, XML parsing, ref cache, pricing) |
| `price-normalization.test.ts` | Tests for price normalization |
| `providerPrice.ts` | Price validation (MIN_PROVIDER_TOUR_PRICE_CZK, isPlausibleProviderPriceCzk) |
| `providerPrice.test.ts` | Tests for provider price |
| `response.ts` | Response helpers (success/fail) |
| `sessionStore.ts` | Session store |

**No existing shared provider base class or utility module** — each provider is standalone with duplicated code.

## 9. `docs/operations.md` (216 lines)

**Secrets mentioned:**
- SSH key: `ssh-key-new.key` (in repo root)
- Database user: `skytravel`@`127.0.0.1`, password: `skytravel_password_2026`
- Server IP: `167.233.47.103`
- Git remote: `https://github.com/danilgorbunofff/skytravel.git`
- Required env vars: `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_ORIGIN`, `ALEXANDRIA_API_KEY`, `OREXTRAVEL_TOKEN`
- `OREX_EUR_TO_CZK` (used in orextravel.ts line 14: `Number(process.env.OREX_EUR_TO_CZK || 25.5)`)

## 10. SHARED_KEYS Usage — All Locations

| File | Line | Description |
|------|------|-------------|
| `admin/providers.ts` | 12-23 | **Definition**: admin's SHARED_KEYS set (10 keys) |
| `admin/providers.ts` | 100 | Usage: `if (!SHARED_KEYS.has(key))` — bypass logic |
| `providerSearchPublic.ts` | 19-38 | **Definition**: public's SHARED_KEYS set (18 keys) |
| `providerSearchPublic.ts` | 102 | Usage: `if (SHARED_KEYS.has(key)) continue;` — skip shared keys in validateProviderFilters |

**Key difference**: Admin's SHARED_KEYS has 10 items (no `nights`, `stars`, `board`, `adults`, `children`, `transport`, `hotelOnly`, `offerGroupKey`, `destinationSlug`). Public has 18.

## 11. `.gitignore` and `.env`

**`.gitignore`** (line 3): `.env` IS listed. But `docs/operations.md` contains hardcoded credentials (DB password `skytravel_password_2026`, SSH key name, server IP). Additionally `OREX_EUR_TO_CZK` is read from env with a fallback of 25.5 hardcoded in `orextravel.ts:14`.

No `.env` file was force-added based on gitignore check.
