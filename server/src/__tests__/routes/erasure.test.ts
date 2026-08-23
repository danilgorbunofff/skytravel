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

describe("POST /api/erasure — validation", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/erasure")
      .send({})
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/erasure")
      .send({ email: "not-an-email" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when email is an empty string", async () => {
    const res = await request(app)
      .post("/api/erasure")
      .send({ email: "" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 for non-string email value", async () => {
    const res = await request(app)
      .post("/api/erasure")
      .send({ email: 12345 })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });
});

describe("POST /api/erasure — execution (requires DB)", () => {
  it("returns 404 when no data exists for the given email", { skip: skipWithoutDb }, async () => {
    const res = await request(app)
      .post("/api/erasure")
      .send({ email: "erasure-nonexistent@example.com" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 404);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });

  it("returns 200 and deletes data for an existing email", { skip: skipWithoutDb }, async () => {
    // First create a lead to have data to erase
    const createRes = await request(app)
      .post("/api/inquiries")
      .send({
        email: "erasure-test@example.com",
        destination: "Egypt",
        marketingConsent: true,
        gdprConsent: true,
      })
      .set("Content-Type", "application/json");

    assert.equal(createRes.status, 201);

    // Now erase it
    const res = await request(app)
      .post("/api/erasure")
      .send({ email: "erasure-test@example.com" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.data);
    assert.ok("deleted" in res.body.data);
    // At least the lead we created should be deleted
    assert.ok(
      res.body.data.deleted.leads >= 1,
      `Expected at least 1 lead deleted, got ${res.body.data.deleted.leads}`,
    );
  });
});
