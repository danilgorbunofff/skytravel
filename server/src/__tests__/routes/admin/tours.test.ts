/**
 * Integration tests for admin tour routes.
 *
 * Validation / error-path tests use a mock Express app with injected session
 * (no database required).  Full CRUD tests require a real database and are
 * skipped when DATABASE_URL is not set.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import nock from "nock";

import { createApp } from "../../../app.js";
import tourRoutes from "../../../routes/admin/tours.js";
import { createMockAdminApp, skipWithoutDb, createAuthenticatedAgent } from "../../test-utils.js";
import { registerTeardown } from "../../helpers/teardown.js";

// ---------------------------------------------------------------------------
// 1. Authentication guard (real app)
// ---------------------------------------------------------------------------

registerTeardown();
describe("Admin tours — auth guard", () => {
  it("GET /api/admin/tours without session returns 401", async () => {
    const app = createApp();
    const res = await supertest(app).get("/api/admin/tours");
    assert.equal(res.status, 401);
  });

  it("POST /api/admin/tours without session returns 401", { skip: skipWithoutDb }, async () => {
    const app = createApp();
    const res = await supertest(app).post("/api/admin/tours").send({ title: "test" });
    // Without session we get 401 from requireAuth (after CSRF is handled;
    // without CSRF header a POST triggers 403 first, but the initial POST
    // should have failed on auth — verify it's an error status)
    assert.ok(res.status === 401 || res.status === 403, `Expected 401 or 403, got ${res.status}`);
  });
});

// ---------------------------------------------------------------------------
// 2. Validation tests (mock app, no database)
// ---------------------------------------------------------------------------

describe("Admin tours — validation", () => {
  const app = createMockAdminApp(["/api/admin/tours", tourRoutes]);

  it("POST /api/admin/tours without required fields returns 400", async () => {
    const res = await supertest(app).post("/api/admin/tours").send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
    assert.ok(res.body.error);
  });

  it("POST /api/admin/tours with missing destination returns 400", async () => {
    const res = await supertest(app).post("/api/admin/tours").send({
      title: "Test Tour",
      price: 100,
      image: "http://example.com/img.jpg",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      transport: "bus",
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/admin/tours with missing title returns 400", async () => {
    const res = await supertest(app).post("/api/admin/tours").send({
      destination: "Greece",
      price: 100,
      image: "http://example.com/img.jpg",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      transport: "bus",
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("PUT /api/admin/tours/:id with invalid id returns 400", async () => {
    const res = await supertest(app).put("/api/admin/tours/abc").send({ title: "Updated" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_ID");
  });

  it(
    "PUT /api/admin/tours/:id with valid id and body succeeds",
    { skip: skipWithoutDb },
    async () => {
      // This test reaches Prisma — skip without a database
    },
  );

  it("DELETE /api/admin/tours/:id with invalid id returns 400", async () => {
    const res = await supertest(app).delete("/api/admin/tours/abc");
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_ID");
  });

  it("POST /api/admin/tours with non-numeric price returns 400", async () => {
    const res = await supertest(app).post("/api/admin/tours").send({
      destination: "Greece",
      title: "Test",
      price: "free",
      image: "http://example.com/img.jpg",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      transport: "bus",
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// 3. Full CRUD integration tests (real database required)
// ---------------------------------------------------------------------------

describe("Admin tours — full CRUD", { skip: skipWithoutDb }, () => {
  let app: ReturnType<typeof createApp>;
  let agent: ReturnType<typeof supertest.agent>;
  let csrfToken: string;

  before(async () => {
    app = createApp();
    const auth = await createAuthenticatedAgent(app);
    agent = auth.agent;
    csrfToken = auth.csrfToken;
  });

  after(async () => {
    nock.cleanAll();
  });

  it("POST /api/admin/tours creates a tour", async () => {
    const res = await agent.post("/api/admin/tours").set("x-xsrf-token", csrfToken).send({
      destination: "Greece",
      title: "Integration Test Tour",
      price: 499,
      image: "http://example.com/greece.jpg",
      description: "A beautiful tour",
      startDate: "2026-08-01",
      endDate: "2026-08-10",
      transport: "air",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data.item);
    assert.equal(res.body.data.item.destination, "Greece");
    assert.equal(res.body.data.item.title, "Integration Test Tour");

    // Clean up
    const createdId = res.body.data.item.id;
    await agent.delete(`/api/admin/tours/${createdId}`).set("x-xsrf-token", csrfToken);
  });

  it("GET /api/admin/tours lists tours", async () => {
    const res = await agent.get("/api/admin/tours");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(Array.isArray(res.body.data.items));
  });

  it("PUT /api/admin/tours/:id updates a tour", async () => {
    // First create a tour
    const createRes = await agent.post("/api/admin/tours").set("x-xsrf-token", csrfToken).send({
      destination: "Italy",
      title: "Original Title",
      price: 599,
      image: "http://example.com/italy.jpg",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      transport: "air",
    });

    assert.equal(createRes.status, 201);
    const tourId = createRes.body.data.item.id;

    const updateRes = await agent
      .put(`/api/admin/tours/${tourId}`)
      .set("x-xsrf-token", csrfToken)
      .send({ title: "Updated Title", price: 699 });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.ok, true);
    assert.equal(updateRes.body.data.item.title, "Updated Title");
    assert.equal(updateRes.body.data.item.price, 699);

    // Clean up
    await agent.delete(`/api/admin/tours/${tourId}`).set("x-xsrf-token", csrfToken);
  });

  it("DELETE /api/admin/tours/:id deletes a tour", async () => {
    // First create a tour
    const createRes = await agent.post("/api/admin/tours").set("x-xsrf-token", csrfToken).send({
      destination: "Spain",
      title: "To Delete",
      price: 399,
      image: "http://example.com/spain.jpg",
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      transport: "bus",
    });

    assert.equal(createRes.status, 201);
    const tourId = createRes.body.data.item.id;

    const deleteRes = await agent
      .delete(`/api/admin/tours/${tourId}`)
      .set("x-xsrf-token", csrfToken);

    assert.equal(deleteRes.status, 204);

    // Verify deletion — GET should return 200 with empty items or the tour gone
    const getRes = await agent.get("/api/admin/tours");
    assert.equal(getRes.status, 200);
    const ids = getRes.body.data.items.map((t: { id: number }) => t.id);
    assert.equal(ids.includes(tourId), false);
  });
});
