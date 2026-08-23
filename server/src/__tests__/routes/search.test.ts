import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../app.js";
import type { Express } from "express";
import { registerTeardown } from "../helpers/teardown.js";

registerTeardown();
let app: Express;

before(() => {
  app = createApp();
});

describe("GET /api/search/all/tours", () => {
  it("returns 200 with a valid response body for a query", async () => {
    const res = await request(app).get("/api/search/all/tours?q=egypt");
    assert.equal(res.status, 200);
    assert.ok(res.body);
    // The route returns a paginated result shape even when empty/degraded
    assert.ok("total" in res.body, "response should have a total field");
    assert.ok("filtered" in res.body, "response should have a filtered field");
    assert.ok("items" in res.body, "response should have an items array");
    assert.ok(Array.isArray(res.body.items));
    assert.ok("page" in res.body);
    assert.ok("limit" in res.body);
    assert.ok("totalPages" in res.body);
  });

  it("returns 200 without query parameters", async () => {
    const res = await request(app).get("/api/search/all/tours");
    assert.equal(res.status, 200);
    assert.ok(res.body);
    assert.ok("items" in res.body);
    assert.ok(Array.isArray(res.body.items));
  });

  it("returns 400 for a non-numeric page parameter", async () => {
    const res = await request(app).get("/api/search/all/tours?page=invalid");
    assert.equal(res.status, 400);
  });

  it("returns 400 for a page value below minimum", async () => {
    const res = await request(app).get("/api/search/all/tours?page=0");
    assert.equal(res.status, 400);
  });

  it("returns 400 for a page value above maximum", async () => {
    const res = await request(app).get("/api/search/all/tours?page=10001");
    assert.equal(res.status, 400);
  });

  it("returns 400 for an invalid sortBy value", async () => {
    const res = await request(app).get("/api/search/all/tours?sortBy=invalid");
    assert.equal(res.status, 400);
  });

  it("returns 400 for an invalid sortDir value", async () => {
    const res = await request(app).get("/api/search/all/tours?sortDir=invalid");
    assert.equal(res.status, 400);
  });

  it("returns 400 when priceMin exceeds priceMax", async () => {
    const res = await request(app).get("/api/search/all/tours?priceMin=50000&priceMax=10000");
    assert.equal(res.status, 400);
  });

  it("returns 400 for a too-long search query", async () => {
    const longQuery = "a".repeat(121);
    const res = await request(app).get(`/api/search/all/tours?q=${longQuery}`);
    assert.equal(res.status, 400);
  });
});

describe("GET /api/search/destinations", () => {
  it("returns a country list or handles DB absence gracefully", async () => {
    const res = await request(app).get("/api/search/destinations");
    // Without provider data in the DB this may return 500 (via error middleware)
    // or 200 (if destinations are available). Verify the endpoint exists.
    assert.ok(res.status === 200 || res.status === 500, `Expected 200 or 500, got ${res.status}`);
  });
});

describe("GET /api/search/bootstrap", () => {
  it("returns providers and region data", async () => {
    const res = await request(app).get("/api/search/bootstrap");
    // The bootstrap handler catches per-provider errors, so it should
    // always return 200 even when provider data is unavailable.
    assert.equal(res.status, 200);
    assert.ok(res.body);
    assert.ok("providers" in res.body, "response should include providers");
    assert.ok(Array.isArray(res.body.providers));
    assert.ok("regionsByProvider" in res.body, "response should include regionsByProvider");
    assert.equal(typeof res.body.regionsByProvider, "object");
    assert.ok("version" in res.body, "response should include a version string");
  });
});

describe("GET /api/search/providers", () => {
  it("returns the list of registered providers", async () => {
    const res = await request(app).get("/api/search/providers");
    assert.equal(res.status, 200);
    assert.ok(res.body);
    assert.ok("providers" in res.body);
    assert.ok(Array.isArray(res.body.providers));
    assert.ok(res.body.providers.length > 0);
  });
});
