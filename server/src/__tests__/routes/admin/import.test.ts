/**
 * Integration tests for the admin provider import route.
 *
 * Uses a mock Express app with mock session.  Tests the error path
 * (invalid provider → 404) and a basic dispatch flow.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { createMockAdminApp, skipWithoutDb } from "../../test-utils.js";
import providersRoutes from "../../../routes/admin/providers.js";
import { registerTeardown } from "../../helpers/teardown.js";

// ---------------------------------------------------------------------------
// 1. Invalid provider & validation (no database needed)
// ---------------------------------------------------------------------------

registerTeardown();
describe("Admin import — invalid provider", () => {
  const app = createMockAdminApp(["/api/admin/providers", providersRoutes]);

  it("POST /api/admin/providers/:id/import with unknown provider returns 404", async () => {
    const res = await supertest(app)
      .post("/api/admin/providers/nonexistent/import")
      .send({ ids: ["test-id-1"] });

    assert.equal(res.status, 404);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });

  it("POST /api/admin/providers/:id/import without ids returns 400", async () => {
    const res = await supertest(app).post("/api/admin/providers/alexandria/import").send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/admin/providers/:id/import with empty ids array returns 400", async () => {
    const res = await supertest(app)
      .post("/api/admin/providers/alexandria/import")
      .send({ ids: [] });
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
  });

  it("GET /api/admin/providers/nonexistent/regions returns 404", async () => {
    const res = await supertest(app).get("/api/admin/providers/nonexistent/regions");
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 2. Import dispatch (needs database for prisma)
// ---------------------------------------------------------------------------

describe("Admin import — provider dispatch", { skip: skipWithoutDb }, () => {
  const app = createMockAdminApp(["/api/admin/providers", providersRoutes]);

  it("POST /api/admin/providers/alexandria/import dispatches to the provider", async () => {
    const res = await supertest(app)
      .post("/api/admin/providers/alexandria/import")
      .send({ ids: ["test-id-1"], regionCtx: {} });

    // The provider's importTours runs and returns an ImportResult.
    // Empty IDs should yield zero created/updated but success.
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);

    // ImportResult shape: { ok, created, updated, total }
    assert.equal(typeof res.body.data.created, "number");
    assert.equal(typeof res.body.data.updated, "number");
    assert.equal(typeof res.body.data.total, "number");
  });
});
