import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCachedPublicSearchResult,
  setCachedPublicSearchResult,
  invalidatePublicSearchCache,
  getPublicSearchCacheStats,
  getOrFetchPublicSearchResult,
} from "./publicSearchCache.js";

// Helper to clear cache between tests
function resetCache(): void {
  invalidatePublicSearchCache();
}

// ──────────────────────────────────────────────
// Basic set / get
// ──────────────────────────────────────────────
describe("set and get", () => {
  it("stores and retrieves a value", () => {
    resetCache();
    setCachedPublicSearchResult("basic:1", { hello: "world" });
    const result = getCachedPublicSearchResult("basic:1");
    assert.deepEqual(result, { hello: "world" });
  });

  it("returns null for a missing key", () => {
    resetCache();
    assert.equal(getCachedPublicSearchResult("nonexistent"), null);
  });

  it("stores falsy values correctly (0)", () => {
    resetCache();
    setCachedPublicSearchResult("falsy:zero", 0);
    assert.equal(getCachedPublicSearchResult("falsy:zero"), 0);
  });

  it("stores falsy values correctly (empty string)", () => {
    resetCache();
    setCachedPublicSearchResult("falsy:empty", "");
    assert.equal(getCachedPublicSearchResult("falsy:empty"), "");
  });

  it("stores null values", () => {
    resetCache();
    setCachedPublicSearchResult("null:test", null);
    assert.equal(getCachedPublicSearchResult("null:test"), null);
  });

  it("overwrites existing key", () => {
    resetCache();
    setCachedPublicSearchResult("overwrite:1", "old");
    setCachedPublicSearchResult("overwrite:1", "new");
    assert.equal(getCachedPublicSearchResult("overwrite:1"), "new");
  });
});

// ──────────────────────────────────────────────
// Invalidation
// ──────────────────────────────────────────────
describe("invalidatePublicSearchCache", () => {
  it("clears provider-prefixed entries", () => {
    resetCache();
    setCachedPublicSearchResult("alexandria:list", "v1");
    setCachedPublicSearchResult("another:list", "v2");
    setCachedPublicSearchResult("other:key", "v3");

    invalidatePublicSearchCache("alexandria");

    assert.equal(getCachedPublicSearchResult("alexandria:list"), null);
    assert.equal(getCachedPublicSearchResult("another:list"), "v2");
    assert.equal(getCachedPublicSearchResult("other:key"), "v3");
  });

  it("clears destinations: and all: prefixes alongside provider entries", () => {
    resetCache();
    setCachedPublicSearchResult("alexandria:tours", "v1");
    setCachedPublicSearchResult("destinations:list", "v2");
    setCachedPublicSearchResult("all:search", "v3");

    invalidatePublicSearchCache("alexandria");

    assert.equal(getCachedPublicSearchResult("alexandria:tours"), null);
    assert.equal(getCachedPublicSearchResult("destinations:list"), null);
    assert.equal(getCachedPublicSearchResult("all:search"), null);
  });

  it("clears everything when called without providerId", () => {
    resetCache();
    setCachedPublicSearchResult("key:a", "v1");
    setCachedPublicSearchResult("key:b", "v2");

    invalidatePublicSearchCache();

    assert.equal(getCachedPublicSearchResult("key:a"), null);
    assert.equal(getCachedPublicSearchResult("key:b"), null);
  });

  it("does not fail when cache is already empty", () => {
    resetCache();
    invalidatePublicSearchCache("alexandria");
    // Should not throw
    assert.equal(getPublicSearchCacheStats().size, 0);
  });
});

// ──────────────────────────────────────────────
// getOrFetchPublicSearchResult — single-flight
// ──────────────────────────────────────────────
describe("getOrFetchPublicSearchResult", () => {
  it("returns cached data on hit", async () => {
    resetCache();
    setCachedPublicSearchResult("sf:hit", "cached-value");
    const result = await getOrFetchPublicSearchResult(
      "sf:hit",
      async () => "new-value",
    );
    assert.equal(result.data, "cached-value");
    assert.equal(result.cache, "hit");
  });

  it("returns fetched data on miss", async () => {
    resetCache();
    const result = await getOrFetchPublicSearchResult(
      "sf:miss",
      async () => "fresh-data",
    );
    assert.equal(result.data, "fresh-data");
    assert.equal(result.cache, "miss");
  });

  it("deduplicates concurrent requests (single-flight)", async () => {
    resetCache();
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      // Simulate async work to ensure concurrent calls overlap
      await new Promise((r) => setTimeout(r, 20));
      return "deduped-result";
    };

    const [r1, r2] = await Promise.all([
      getOrFetchPublicSearchResult("sf:dedup", fetcher),
      getOrFetchPublicSearchResult("sf:dedup", fetcher),
    ]);

    assert.equal(r1.data, "deduped-result");
    assert.equal(r2.data, "deduped-result");
    assert.equal(callCount, 1, "fetcher should only be called once");
  });

  it("second request gets value after first resolves", async () => {
    resetCache();
    // First call: miss → fetch
    const r1 = await getOrFetchPublicSearchResult(
      "sf:then-hit",
      async () => "first-fetch",
    );
    assert.equal(r1.cache, "miss");

    // Second call: now it should be a hit
    const r2 = await getOrFetchPublicSearchResult(
      "sf:then-hit",
      async () => "should-not-be-called",
    );
    assert.equal(r2.data, "first-fetch");
    assert.equal(r2.cache, "hit");
  });
});

// ──────────────────────────────────────────────
// Stats reporting
// ──────────────────────────────────────────────
describe("getPublicSearchCacheStats", () => {
  it("reports correct size", () => {
    resetCache();
    setCachedPublicSearchResult("stats:1", "a");
    setCachedPublicSearchResult("stats:2", "b");
    const stats = getPublicSearchCacheStats();
    assert.equal(stats.size, 2);
  });

  it("reports maxSize as 2000", () => {
    resetCache();
    const stats = getPublicSearchCacheStats();
    assert.equal(stats.maxSize, 2000);
  });

  it("reports fresh entries count", () => {
    resetCache();
    setCachedPublicSearchResult("fresh:1", "a");
    const stats = getPublicSearchCacheStats();
    assert.equal(stats.freshEntries, 1);
  });

  it("reports inflight count as a number", () => {
    resetCache();
    const stats = getPublicSearchCacheStats();
    assert.ok(typeof stats.inflight === "number");
  });

  it("size matches number of distinct keys set", () => {
    resetCache();
    for (let i = 0; i < 10; i++) {
      setCachedPublicSearchResult(`bulk:${i}`, i);
    }
    assert.equal(getPublicSearchCacheStats().size, 10);
  });
});

// ──────────────────────────────────────────────
// LRU eviction — insert more than max entries
// ──────────────────────────────────────────────
describe("LRU eviction", () => {
  it("evicts entries when exceeding max size", () => {
    resetCache();
    // Fill the cache beyond its 2000-entry limit
    for (let i = 0; i < 2100; i++) {
      setCachedPublicSearchResult(`evict:${i}`, i);
    }
    const stats = getPublicSearchCacheStats();
    // Should have at most 2000 entries
    assert.ok(stats.size <= 2000, `size ${stats.size} should be <= 2000`);
    // Oldest entries (0, 1, 2, ...) should have been evicted
    assert.equal(
      getCachedPublicSearchResult("evict:0"),
      null,
      "oldest entry should have been evicted",
    );
    assert.equal(
      getCachedPublicSearchResult("evict:1999"),
      1999,
      "newer entry should still be present",
    );
  });

  it("preserves recently accessed entries during eviction", () => {
    resetCache();
    // Fill the cache
    for (let i = 0; i < 2000; i++) {
      setCachedPublicSearchResult(`lru:${i}`, i);
    }
    // Access some early entries to promote them
    getCachedPublicSearchResult("lru:0");
    getCachedPublicSearchResult("lru:1");
    getCachedPublicSearchResult("lru:2");
    // Add more to force eviction
    for (let i = 2000; i < 2020; i++) {
      setCachedPublicSearchResult(`lru:${i}`, i);
    }
    // Recently accessed entries (0, 1, 2) should survive
    assert.equal(getCachedPublicSearchResult("lru:0"), 0);
    assert.equal(getCachedPublicSearchResult("lru:1"), 1);
    assert.equal(getCachedPublicSearchResult("lru:2"), 2);
  });
});
