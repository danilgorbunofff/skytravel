import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import express from "express";
import { createMockAdminApp, skipWithoutDb } from "../test-utils.js";
import authRoutes from "../../routes/admin/auth.js";
import type { Express, Request, Response, NextFunction } from "express";

let app: Express;
let unauthApp: Express;

before(() => {
  // Mock app with admin session — bypasses CSRF for login/logout tests
  // Mounts auth routes at /api/admin so paths match /api/admin/login etc.
  app = createMockAdminApp(["/api/admin", authRoutes]);

  // Minimal app without an authenticated session for the 401 test.
  // Includes a bare session object (no adminUserId) so the handler doesn't crash,
  // but no CSRF middleware since GET is not blocked by CSRF.
  unauthApp = express();
  unauthApp.use(express.json());
  unauthApp.use((req: Request, _res: Response, next: NextFunction) => {
    (req as unknown as Record<string, unknown>).session = {
      id: "test-session-id",
      regenerate: (cb: (err?: Error) => void) => cb?.(),
      destroy: (cb: (err?: Error) => void) => cb?.(),
      save: (cb: (err?: Error) => void) => cb?.(),
      reload: (cb: (err?: Error) => void) => cb?.(),
      touch: (cb: (err?: Error) => void) => cb?.(),
      cookie: {
        originalMaxAge: 28800000,
        expires: new Date(Date.now() + 28800000),
        httpOnly: true,
        secure: false,
        sameSite: "lax" as const,
      },
    };
    next();
  });
  unauthApp.use("/api/admin", authRoutes);
  // Error handler
  unauthApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.name === "ZodError") {
      res
        .status(400)
        .json({ ok: false, error: { code: "VALIDATION_ERROR", message: err.message } });
      return;
    }
    res
      .status(500)
      .json({ ok: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  });
});

describe("POST /api/admin/login", () => {
  it(
    "returns 200 with a session when valid credentials are provided",
    { skip: skipWithoutDb },
    async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ login: "admin", password: "admin123" })
        .set("Content-Type", "application/json");

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.ok(res.body.data);
      assert.equal(typeof res.body.data.login, "string");
    },
  );

  it("returns 401 for invalid credentials", { skip: skipWithoutDb }, async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ login: "admin", password: "wrong-password" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
  });

  it("returns 400 when login field is missing", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ password: "admin123" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 when password field is missing", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ login: "admin" })
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });

  it("returns 400 for empty request body", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({})
      .set("Content-Type", "application/json");

    assert.equal(res.status, 400);
  });
});

describe("POST /api/admin/logout", () => {
  it("returns 204 for logout (even without an active session)", async () => {
    const res = await request(app).post("/api/admin/logout");
    assert.equal(res.status, 204);
  });
});

describe("GET /api/admin/me", () => {
  it("returns 401 without an authenticated session", async () => {
    // Use unauthApp — no adminUserId in session → handler returns 401
    const res = await request(unauthApp).get("/api/admin/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  it(
    "returns 200 after successful login (session persistence)",
    { skip: skipWithoutDb },
    async () => {
      const loginRes = await request(app)
        .post("/api/admin/login")
        .send({ login: "admin", password: "admin123" })
        .set("Content-Type", "application/json");

      assert.equal(loginRes.status, 200);

      // The mock session always provides adminUserId: 1, so /me returns the admin user
      const meRes = await request(app).get("/api/admin/me");
      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.ok, true);
      assert.equal(meRes.body.data.login, "admin");
    },
  );
});
