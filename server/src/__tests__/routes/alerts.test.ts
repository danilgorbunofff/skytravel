import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../app.js";
import { skipWithoutDb } from "../test-utils.js";
import type { Express } from "express";
import { registerTeardown } from "../helpers/teardown.js";

registerTeardown();
let app: Express;

before(() => {
  app = createApp();
});

describe("POST /api/alerts — validation", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        providerId: "alexandria",
        externalId: "test-123",
        priceMax: 10000,
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        email: "not-an-email",
        providerId: "alexandria",
        externalId: "test-123",
        priceMax: 10000,
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when providerId is missing", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        email: "user@example.com",
        externalId: "test-123",
        priceMax: 10000,
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when externalId is missing", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        email: "user@example.com",
        providerId: "alexandria",
        priceMax: 10000,
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when priceMax is missing", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        email: "user@example.com",
        providerId: "alexandria",
        externalId: "test-123",
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when priceMax is not positive", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        email: "user@example.com",
        providerId: "alexandria",
        externalId: "test-123",
        priceMax: -100,
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when priceMax is zero", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .send({
        email: "user@example.com",
        providerId: "alexandria",
        externalId: "test-123",
        priceMax: 0,
      })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });
});

describe("POST /api/alerts — creation (requires DB)", () => {
  it(
    "returns 201 with valid data when database is available",
    { skip: skipWithoutDb },
    async () => {
      const res = await request(app)
        .post("/api/alerts")
        .send({
          email: `alert-test-${process.pid}@example.com`,
          providerId: "alexandria",
          externalId: "integration-test-tour",
          priceMax: 15000,
          tourTitle: "Integration Test Tour",
        })
        .set("Content-Type", "application/json");

      assert.equal(res.status, 201);
      assert.equal(res.body.ok, true);
    },
  );

  it("handles duplicate alert registration gracefully", { skip: skipWithoutDb }, async () => {
    const body = {
      email: `alert-duplicate-${process.pid}@example.com`,
      providerId: "alexandria",
      externalId: "dup-tour-123",
      priceMax: 20000,
    };

    // First registration should succeed
    const first = await request(app)
      .post("/api/alerts")
      .send(body)
      .set("Content-Type", "application/json");

    assert.equal(first.status, 201);

    // Second registration for the same email + tour should return success
    // (with a "already registered" message) rather than an error
    const second = await request(app)
      .post("/api/alerts")
      .send(body)
      .set("Content-Type", "application/json");

    // The route returns 200 (not 201) for duplicates
    assert.ok(
      second.status === 200 || second.status === 201,
      `Expected 200 or 201, got ${second.status}`,
    );
  });
});
