# PHASE 07: Test Coverage Expansion

## Overview

Expand the current thin test suite (7 server files, 6 client files, 3 E2E tests) to cover routes, providers, key components, and critical user flows.

**Risk: MEDIUM** — integration tests require test database; E2E tests require running dev server.

---

## Current State

### Server Tests (Node native runner)
| File | Status | Notes |
|------|--------|-------|
| `server/src/__tests__/app.integration.test.ts` | ✅ | Express app creation, 404, security headers |
| `server/src/middleware/asyncHandler.test.ts` | ✅ | Basic |
| `server/src/lib/ApiError.test.ts` | ✅ | Good |
| `server/src/lib/i18n.test.ts` | ✅ | Good |
| `server/src/lib/providerPrice.test.ts` | ❌ | Uses deprecated `assert.equal()` |
| `server/src/lib/price-normalization.test.ts` | ✅ | |
| `server/src/providers/offerGrouping.test.ts` | ✅ | Basic |

### Client Tests (vitest)
| File | Status |
|------|--------|
| `client/src/lib/prices.test.ts` | ✅ |
| `client/src/lib/formatters.test.ts` | ✅ |
| `client/src/lib/images.test.ts` | ✅ |
| `client/src/hooks/useCookieConsent.test.ts` | ✅ |
| `client/src/hooks/useFavorites.test.ts` | ✅ |
| `client/src/utils.test.ts` | ✅ |

### E2E Tests (Playwright)
| File | Status |
|------|--------|
| `e2e/homepage.spec.ts` | ✅ |
| `e2e/search.spec.ts` | ✅ |
| `e2e/admin-login.spec.ts` | ✅ |

---

## Step 1: Fix Existing Test Issues

### File: `server/src/lib/providerPrice.test.ts`
- Replace all `assert.equal()` with `assert.strictEqual()`
- Verify type assertions match strict equality

```typescript
// Before:
assert.equal(isPlausibleProviderPriceCzk(5000), true);

// After:
assert.strictEqual(isPlausibleProviderPriceCzk(5000), true);
```

### Verification
```bash
npm --workspace server run test
# Output: all 7 test files pass, no deprecated API warnings
```

---

## Step 2: Create Server Route Integration Tests

### Infrastructure
- Use `createApp()` from `server/src/app.ts` to create a test app instance
- Use `node:test` with `supertest` (or use `node:test` with `http.request`)
- For mocking external APIs: use `nock` (HTTP mocking) or `msw` (more modern)
- **Add dependency:** `npm --workspace server add -D nock supertest`

### New Test Files

#### `server/src/__tests__/routes/search.test.ts`
```typescript
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../app.js";
// ...

describe("GET /api/search/all/tours", () => {
  it("returns 200 with valid query params");
  it("returns 400 with invalid date range");
  it("returns empty results for non-matching query");
  it("paginates correctly with page/limit params");
  it("returns 401 when auth is required");
  it("handles provider fetch errors gracefully");
});
```

**Test scenarios:**
- Happy path: valid query returns tours
- Validation: invalid date (end before start) → 400
- Pagination: page=1, limit=10 returns correct slice
- Auth: requires valid session for admin endpoints
- Provider error: mock provider throws → 502 with clear message
- Cache: subsequent identical request returns cached data

#### `server/src/__tests__/routes/auth.test.ts`
```typescript
describe("POST /api/auth/login", () => {
  it("returns token with valid credentials");
  it("returns 401 with invalid password");
  it("returns 429 after too many attempts (rate limit)");
});

describe("POST /api/auth/logout", () => {
  it("invalidates session");
});

describe("GET /api/auth/session", () => {
  it("returns current user for valid session");
  it("returns 401 for expired session");
});
```

#### `server/src/__tests__/routes/alerts.test.ts`
```typescript
describe("Price alerts", () => {
  it("creates price alert with valid data");
  it("verifies alert via token link");
  it("returns 400 with invalid email");
  it("prevents duplicate alert for same tour+email");
});
```

#### `server/src/__tests__/routes/erasure.test.ts`
```typescript
describe("GDPR erasure", () => {
  it("deletes lead data given valid token");
  it("returns 404 for already-deleted data");
  it("prevents erasure without valid token");
});
```

#### `server/src/__tests__/routes/admin/tours.test.ts`
```typescript
describe("Admin tour CRUD", () => {
  it("creates a tour with valid data");
  it("rejects tour without required fields");
  it("lists all tours with pagination");
  it("updates tour fields");
  it("deletes tour by id");
  it("requires admin auth");
});
```

#### `server/src/__tests__/routes/admin/campaigns.test.ts`
```typescript
describe("Campaign management", () => {
  it("creates a campaign with valid data");
  it("queues campaign for sending");
  it("lists campaign history");
  it("prevents send to unconsented leads");
});
```

#### `server/src/__tests__/routes/admin/uploads.test.ts`
```typescript
describe("File uploads", () => {
  it("accepts valid image upload");
  it("rejects oversized file (>5MB)");
  it("rejects non-image file type");
});
```

#### `server/src/__tests__/routes/admin/import.test.ts`
```typescript
describe("Provider import", () => {
  it("imports selected tours from provider");
  it("imports all tours from provider");
  it("tracks import results (created/updated/failed)");
  it("rejects import without providerId");
});
```

### Acceptance
- All new tests pass with test database
- Mocked external APIs don't reach real endpoints
- Test database is cleaned between test runs

---

## Step 3: Expand Provider Unit Tests

### New Test Files

#### `server/src/providers/alexandriaProvider.test.ts`
- Parse mock XML fixture files
- Handle malformed XML gracefully
- Handle missing fields gracefully
- Test pagination logic
- Test last-minute extraction
- Test different destination types

Create fixture file: `server/src/providers/__fixtures__/alexandria-sample.xml`

#### `server/src/providers/orextravelProvider.test.ts`
- Parse mock JSON API responses
- Handle missing optional fields
- Test price parsing and normalization
- Test departure/destination mapping
- Test error responses from API
- Test rate limiting / retry logic

Create fixture: `server/src/providers/__fixtures__/orextravel-sample.json`

#### `server/src/providers/publicSearchCache.test.ts`
```typescript
describe("PublicSearchCache", () => {
  it("stores and retrieves values");
  it("evicts entries at LRU limit");
  it("respects TTL expiration");
  it("serves stale values during background refresh");
  it("deduplicates concurrent requests (single-flight)");
  it("clears all entries on invalidatePublicSearchCache()");
  it("clears provider-specific entries on partial invalidation");
  it("reports correct stats (size, stale, fresh, inflight)");
});
```

#### `server/src/providers/offerGrouping.test.ts`
- Expand existing test with edge cases:
  - Tours with same destination but different hotels
  - Tours with missing offerGroupKey
  - Empty offer list
  - Single offer (no grouping needed)
  - Error in offer group loading
  - Loading state for specific groups

### Acceptance
- Provider XML/JSON parsing well-covered
- Cache single-flight deduplication tested
- Offer edge cases covered

---

## Step 4: Create Client Component Tests

### Infrastructure
- Vitest + @testing-library/react
- Mock API calls with vi.fn() or mock service worker
- Test patterns: render → find element → interact → assert

**Ensure dependencies:**
```bash
npm --workspace client add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### New Test Files

#### `client/src/pages/__tests__/SearchPage.test.tsx`
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";

// Mock hooks
vi.mock("../../hooks/useLanguage", () => ({
  useLanguage: () => ({ lang: "cs", t: (key: string) => key, setLang: vi.fn() }),
}));
vi.mock("../../features/search", () => ({
  useSearchFilters: () => ({}),
  useSearchResults: () => ({ result: null, resultsLoading: false }),
  useOfferGroups: () => ({}),
  useBootstrap: () => ({ destinations: [] }),
  // ...
}));

describe("SearchPage", () => {
  it("renders search hero", () => {});
  it("shows popular destinations when no search active", () => {});
  it("shows loading state during search", () => {});
  it("shows results after search completes", () => {});
  it("shows empty state when no results", () => {});
  it("shows error state on fetch failure", () => {});
  it("opens detail modal on tour click", () => {});
});
```

#### `client/src/pages/__tests__/HomePage.test.tsx`
```typescript
describe("HomePage", () => {
  it("renders hero section with carousel", () => {});
  it("shows own tours grid", () => {});
  it("shows last-minute deals when loaded", () => {});
  it("shows loading state for last-minute", () => {});
  it("shows empty state when no last-minute deals", () => {});
  it("shows favorite destinations grid", () => {});
  it("shows partner tours with budget filter", () => {});
  it("opens tour modal on tour click", () => {});
  it("submits search form to /search", () => {});
});
```

#### `client/src/components/__tests__/TourCard.test.tsx`
```typescript
describe("TourCard", () => {
  it("renders tour destination and price", () => {});
  it("calls onClick when clicked", () => {});
  it("shows fallback image on load error", () => {});
  it("renders i18n destination for current language", () => {});
  it("shows price format correctly", () => {});
});
```

#### `client/src/features/search/components/__tests__/TourDetailModal.test.tsx`
```typescript
describe("TourDetailModal", () => {
  it("renders tour info", () => {});
  it("shows gallery with photos", () => {});
  it("switches between tabs (overview, offers, map)", () => {});
  it("closes on Escape key", () => {});
  it("closes on backdrop click", () => {});
  it("renders inquiry form", () => {});
  it("traps focus within modal", () => {});
  it("shows loading state for offers", () => {});
  it("shows error state for offers", () => {});
});
```

#### `client/src/features/search/components/__tests__/CompareTray.test.tsx`
```typescript
describe("CompareTray", () => {
  it("renders nothing when empty", () => {});
  it("shows count of tours", () => {});
  it("removes tour on thumb click", () => {});
  it("opens compare view on expand", () => {});
  it("clears all on clear button", () => {});
  it("shows correct Czech plural forms", () => {});
});
```

### Acceptance
- Key components have smoke tests
- Loading, error, empty states tested
- User interactions covered (click, keyboard)
- All client tests pass

---

## Step 5: Improve E2E Tests

### New Test Files

#### `e2e/search-full-flow.spec.ts`
```typescript
import { test, expect } from "@playwright/test";

test("complete search flow", async ({ page }) => {
  // 1. Navigate to homepage
  await page.goto("/");
  
  // 2. Enter destination in hero search
  await page.fill("#searchDestination", "Egypt");
  
  // 3. Submit search
  await page.click("button[type='submit']");
  
  // 4. Wait for results to load
  await page.waitForSelector(".tour-grid");
  
  // 5. Verify results contain Egypt tours
  await expect(page.locator(".tour-grid")).toContainText("Egypt");
  
  // 6. Apply price filter
  await page.click("text=Cena");
  // ...
  
  // 7. Open tour detail
  await page.click(".tour-card:first-child");
  
  // 8. Verify detail modal
  await expect(page.locator(".tour-detail-modal")).toBeVisible();
  
  // 9. Submit inquiry
  await page.fill("input[type='email']", "test@example.com");
  await page.click("text=Odeslat poptávku");
  
  // 10. Verify success message
  await expect(page.locator("text=Děkujeme")).toBeVisible();
});
```

#### `e2e/admin-import-flow.spec.ts`
```typescript
test("admin import flow", async ({ page }) => {
  // 1. Navigate to admin login
  await page.goto("/admin-login");
  
  // 2. Login with credentials
  await page.fill("#password", process.env.ADMIN_PASSWORD || "admin123");
  await page.click("button[type='submit']");
  
  // 3. Wait for admin page
  await page.waitForURL("**/admin/**");
  
  // 4. Select provider
  await page.click("text=Alexandria");
  
  // 5. Select region
  await page.click("text=Egypt");
  
  // 6. Wait for tours to load
  await page.waitForSelector(".alex-table-row");
  
  // 7. Select all tours
  await page.click("input[type='checkbox']");
  
  // 8. Import selected
  await page.click("text=Importovat");
  
  // 9. Wait for import result
  await expect(page.locator("text=Import dokončen")).toBeVisible({ timeout: 30000 });
});
```

#### `e2e/mobile-search.spec.ts`
```typescript
test("mobile search flow", async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
  
  // 1. Navigate to search page
  await page.goto("/search");
  
  // 2. Verify mobile filter FAB is visible
  await expect(page.locator(".mobile-filter-fab")).toBeVisible();
  
  // 3. Open mobile filters
  await page.click(".mobile-filter-fab");
  
  // 4. Verify drawer opens
  await expect(page.locator(".mobile-filter-drawer")).toBeVisible();
  
  // 5. Apply filter
  await page.click("text=All Inclusive");
  
  // 6. Apply filter
  await page.click("text=Zobrazit");
  
  // 7. Verify filter applied
  await expect(page.locator(".active-chip")).toContainText("All Inclusive");
  
  // 8. Load more tours
  await page.click("text=Načíst další");
});
```

### E2E Improvements

Replace all flaky timeouts with proper waits:

```typescript
// BEFORE (bad):
await page.waitForTimeout(3000);

// AFTER (good):
await page.waitForSelector(".tour-grid");
// OR:
await page.waitForResponse("**/api/search/**");
```

Add accessibility checks:
```typescript
import AxeBuilder from "@axe-core/playwright";

test("search page passes aXe audit", async ({ page }) => {
  await page.goto("/search");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

**Add dependency:**
```bash
npm add -D @axe-core/playwright
```

### Acceptance
- No `waitForTimeout` in any E2E test
- All critical user flows covered
- Mobile viewport tests pass
- aXe accessibility audit passes (zero violations)
- E2E tests are reliable (no flaky failures)

---

## Files Summary

### New Test Files

| File | Type | Coverage |
|------|------|----------|
| `server/src/__tests__/routes/search.test.ts` | Integration | Public search endpoint |
| `server/src/__tests__/routes/auth.test.ts` | Integration | Login/logout/session |
| `server/src/__tests__/routes/alerts.test.ts` | Integration | Price alerts |
| `server/src/__tests__/routes/erasure.test.ts` | Integration | GDPR erasure |
| `server/src/__tests__/routes/admin/tours.test.ts` | Integration | Tour CRUD |
| `server/src/__tests__/routes/admin/campaigns.test.ts` | Integration | Campaign management |
| `server/src/__tests__/routes/admin/uploads.test.ts` | Integration | File uploads |
| `server/src/__tests__/routes/admin/import.test.ts` | Integration | Provider import |
| `server/src/providers/alexandriaProvider.test.ts` | Unit | XML parsing, edge cases |
| `server/src/providers/orextravelProvider.test.ts` | Unit | JSON parsing, error handling |
| `server/src/providers/publicSearchCache.test.ts` | Unit | LRU, TTL, single-flight, SWR |
| `server/src/providers/offerGrouping.test.ts` | Unit | Edge cases (expand existing) |
| `client/src/pages/__tests__/SearchPage.test.tsx` | Component | Render, states, interactions |
| `client/src/pages/__tests__/HomePage.test.tsx` | Component | Render, sections, CTAs |
| `client/src/components/__tests__/TourCard.test.tsx` | Component | Data display, fallback |
| `client/src/features/search/components/__tests__/TourDetailModal.test.tsx` | Component | Open/close, tabs, inquiry |
| `client/src/features/search/components/__tests__/CompareTray.test.tsx` | Component | Add/remove/compare |
| `e2e/search-full-flow.spec.ts` | E2E | Complete search→detail→inquire |
| `e2e/admin-import-flow.spec.ts` | E2E | Admin import flow |
| `e2e/mobile-search.spec.ts` | E2E | Mobile viewport |
| `server/src/providers/__fixtures__/alexandria-sample.xml` | Fixture | Sample XML for provider test |
| `server/src/providers/__fixtures__/orextravel-sample.json` | Fixture | Sample JSON for provider test |

### Modified Files

| File | Change |
|------|--------|
| `server/src/lib/providerPrice.test.ts` | Fix deprecated `assert.equal` → `assert.strictEqual` |
| `e2e/homepage.spec.ts` | Replace `waitForTimeout` with proper selectors |
| `e2e/search.spec.ts` | Replace `waitForTimeout` with proper selectors |
| `e2e/admin-login.spec.ts` | Replace `waitForTimeout` with proper selectors |

---

## Verification

```bash
# Server tests (requires MySQL test database)
DATABASE_URL=mysql://root:password@localhost:3306/skytravel_test npm --workspace server run test

# Client tests
npm --workspace client run test

# Coverage report
npm --workspace client run test -- --coverage
npm --workspace server run test -- --coverage  # if using c8

# E2E tests (requires dev server)
npm run test:e2e

# Lint
npm run lint
```

### Target Coverage Metrics
| Layer | Current | Target |
|-------|---------|--------|
| Server routes | ~0% | >80% |
| Server providers | ~30% | >80% |
| Server lib | ~50% | >80% |
| Client pages | ~0% | >60% |
| Client components | ~30% | >60% |
| Client hooks | ~50% | >80% |
| Client lib | ~70% | >80% |
| E2E flow coverage | ~30% | >80% of critical paths |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Integration tests require test DB | MEDIUM | Script to create/reset DB before tests |
| Tests fail due to async timing | LOW | Use `waitFor` rather than arbitrary timeouts |
| Component tests hard due to many deps | MEDIUM | Mock hooks at module level; use provider pattern |
| E2E tests flaky | MEDIUM | Replace all `waitForTimeout`; use `waitForSelector`/`waitForResponse` |
| Test data pollution | LOW | Clean DB between test runs; use transactions for integration tests |

---

## Test Data Strategy

### Database Tests
- Use a separate test database (`skytravel_test`)
- Run migrations before tests
- Wrap each test suite in a transaction that rolls back
- Or use a `before`/`after` pattern to clean tables

### Mocking Strategy
- **Server route tests:** Mock external HTTP calls with `nock`
- **Server provider tests:** Use fixture files for XML/JSON parsing tests
- **Client component tests:** Mock hooks with `vi.mock()`, mock API calls with `vi.fn()`
- **E2E tests:** Use real dev server, no mocking

### Fixture Files
Create `server/src/providers/__fixtures__/` directory:
- `alexandria-sample.xml` — realistic Alexandria XML response
- `alexandria-last-minute.xml` — last-minute subset
- `orextravel-sample.json` — realistic Orextravel JSON response
- `orextravel-departures.json` — departures reference data
