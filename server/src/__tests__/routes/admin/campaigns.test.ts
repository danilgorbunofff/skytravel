/**
 * Integration tests for admin campaign routes.
 *
 * Validation / error-path tests use a mock Express app with injected session.
 * Full campaign-send tests require a real database and are skipped when
 * DATABASE_URL is not set.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { createApp } from "../../../app.js";
import campaignRoutes from "../../../routes/admin/campaigns.js";
import { createMockAdminApp, skipWithoutDb, createAuthenticatedAgent } from "../../test-utils.js";

// ---------------------------------------------------------------------------
// 1. Authentication guard (real app)
// ---------------------------------------------------------------------------

describe("Admin campaigns — auth guard", () => {
  it("GET /api/admin/campaigns without session returns 401", async () => {
    const app = createApp();
    const res = await supertest(app).get("/api/admin/campaigns");
    assert.equal(res.status, 401);
  });

  it("POST /api/admin/campaigns/send without session returns 401",
    { skip: skipWithoutDb },
    async () => {
      const app = createApp();
      const res = await supertest(app)
        .post("/api/admin/campaigns/send")
        .send({ subject: "test" });
      // 401 from requireAuth or 403 from CSRF — either is an auth error
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 401 or 403, got ${res.status}`,
      );
    },
  );
});

// ---------------------------------------------------------------------------
// 2. Validation tests (mock app, no database)
// ---------------------------------------------------------------------------

describe("Admin campaigns — validation", () => {
  const app = createMockAdminApp(["/api/admin/campaigns", campaignRoutes]);

  it("POST /api/admin/campaigns/send without body returns 400", async () => {
    const res = await supertest(app).post("/api/admin/campaigns/send").send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
    assert.ok(res.body.error);
  });

  it("POST /api/admin/campaigns/send without subject returns 400", async () => {
    const res = await supertest(app)
      .post("/api/admin/campaigns/send")
      .send({ html: "<p>Body</p>" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/admin/campaigns/send without html returns 400", async () => {
    const res = await supertest(app)
      .post("/api/admin/campaigns/send")
      .send({ subject: "Test" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/admin/campaigns/test without body returns 400", async () => {
    const res = await supertest(app).post("/api/admin/campaigns/test").send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
  });

  it("POST /api/admin/campaigns/test without testEmail returns 400", async () => {
    const res = await supertest(app)
      .post("/api/admin/campaigns/test")
      .send({ subject: "Test", html: "<p>Body</p>" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/admin/campaigns/test with invalid email returns 400", async () => {
    const res = await supertest(app)
      .post("/api/admin/campaigns/test")
      .send({
        subject: "Test",
        html: "<p>Body</p>",
        testEmail: "not-an-email",
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/admin/campaigns/send with invalid segment returns 400", async () => {
    const res = await supertest(app)
      .post("/api/admin/campaigns/send")
      .send({
        subject: "Test",
        html: "<p>Body</p>",
        segment: "invalid-segment",
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// 3. Full campaign-send tests (real database + SMTP mock)
// ---------------------------------------------------------------------------

describe("Admin campaigns — send flow", { skip: skipWithoutDb }, () => {
  let app: ReturnType<typeof createApp>;
  let agent: ReturnType<typeof supertest.agent>;
  let csrfToken: string;

  before(async () => {
    app = createApp();
    const auth = await createAuthenticatedAgent(app);
    agent = auth.agent;
    csrfToken = auth.csrfToken;
  });

  it("POST /api/admin/campaigns/send without SMTP returns 400", async () => {
    // When SMTP is not configured and there are no leads, the route
    // should fail with NO_RECIPIENTS (leads query comes first).
    const res = await agent
      .post("/api/admin/campaigns/send")
      .set("x-xsrf-token", csrfToken)
      .send({
        subject: "Test Campaign",
        html: "<h1>Hello</h1>",
      });

    // Without leads in the DB, we expect NO_RECIPIENTS
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
    assert.ok(
      res.body.error.code === "NO_RECIPIENTS" ||
        res.body.error.code === "SMTP_NOT_CONFIGURED" ||
        res.body.error.code === "INVALID_FROM",
      `Unexpected error code: ${res.body.error.code}`,
    );
  });
});
