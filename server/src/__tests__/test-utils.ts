/**
 * Shared test utilities for admin route integration tests.
 *
 * Provides helpers to create minimal Express apps with mock authentication
 * for testing route handlers without needing a full database connection
 * (validation-only scenarios), plus helpers for full integration tests
 * that require a real database.
 */

import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import supertest from "supertest";
import { ApiError } from "../lib/ApiError.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SuperTestAgent = any;

/**
 * Creates a minimal Express app for testing admin route handlers.
 * Includes:
 * - JSON body parser
 * - Mock authenticated admin session (bypasses requireAuth / CSRF)
 * - An error handler compatible with the real app (handles ApiError, ZodError)
 *
 * Use this for validation / error-path tests that don't need a database.
 *
 * @param mountPoints Pairs of `[mountPath, router]` — the router is mounted
 *                    at the given path (e.g. `["/api/admin/tours", toursRouter]`).
 */
export function createMockAdminApp(...mountPoints: Array<[string, express.Router]>): Express {
  const app = express();
  app.use(express.json());

  // Mock an authenticated admin session + CSRF token in one middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as unknown as Record<string, unknown>).session = {
      adminUserId: 1,
      adminLogin: "admin",
      csrfToken: "test-csrf-token",
      id: "mock-session-id",
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

  for (const [mountPath, router] of mountPoints) {
    app.use(mountPath, router);
  }

  // Centralized error handler (mirrors app.ts behaviour)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // ApiError from lib/response.ts fail()
    if (err instanceof ApiError) {
      const status = (err as Error & { status: number }).status ?? 400;
      const code = (err as Error & { code: string }).code ?? "ERROR";
      res.status(status).json({ ok: false, error: { code, message: err.message } });
      return;
    }

    // ZodError from validateBody / validateQuery
    if (err.name === "ZodError") {
      res
        .status(400)
        .json({ ok: false, error: { code: "VALIDATION_ERROR", message: err.message } });
      return;
    }

    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  });

  return app;
}

/**
 * Parses the XSRF-TOKEN value from a supertest response's set-cookie headers.
 * Returns `null` if no XSRF-TOKEN cookie is present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseXsrfToken(resp: any): string | null {
  const setCookie = resp.headers["set-cookie"];
  if (!setCookie) return null;

  const cookieArray: string[] = Array.isArray(setCookie) ? setCookie : [String(setCookie)];

  for (const cookie of cookieArray) {
    const match = cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Creates a supertest agent authenticated against the real app.
 * Handles the full CSRF + login dance.
 *
 * Because the login route calls `session.regenerate()` (which creates a
 * new session), the initial CSRF token is invalidated. This helper
 * obtains a fresh token after login by making a GET request to an admin
 * endpoint (which triggers `csrfTokenMiddleware` to set a new token).
 *
 * Returns `{ agent, csrfToken }` — use `csrfToken` as the
 * `x-xsrf-token` header on subsequent non-GET requests.
 *
 * Requires:
 * - DATABASE_URL environment variable (Prisma + session store)
 * - An admin user in the database, or ADMIN_LOGIN / ADMIN_PASSWORD env vars
 *   (the login route auto-creates a user when env vars match)
 *
 * @throws If login fails
 */
export async function createAuthenticatedAgent(
  app: Express,
): Promise<{ agent: SuperTestAgent; csrfToken: string }> {
  // Ensure the ADMIN_LOGIN user exists before attempting login.
  const { ensureAdminUser } = await import("../lib/ensureAdminUser.js");
  await ensureAdminUser();

  const agent = supertest.agent(app);

  // Step 1: Obtain initial CSRF token (first request always lacks the header)
  const initResp = await agent.post("/api/admin/me").send({});
  let csrfToken = parseXsrfToken(initResp);
  if (!csrfToken) {
    throw new Error("Could not obtain initial CSRF token");
  }

  // Step 2: Login with the initial CSRF token
  const login = process.env.ADMIN_LOGIN || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin";

  const loginResp = await agent
    .post("/api/admin/login")
    .set("x-xsrf-token", csrfToken)
    .send({ login, password });

  if (loginResp.status !== 200) {
    throw new Error(`Login failed (status ${loginResp.status}): ${JSON.stringify(loginResp.body)}`);
  }

  // Step 3: Session was regenerated — old CSRF token is invalid.
  // Make a GET request to an admin endpoint so csrfTokenMiddleware
  // generates a fresh token for the new session.
  const refreshResp = await agent.get("/api/admin/tours");
  const newToken = parseXsrfToken(refreshResp);
  if (newToken) {
    csrfToken = newToken;
  }
  // If no new token was issued (e.g. because the session already had one),
  // the agent still carries the connect.sid cookie — subsequent requests
  // will have it. We'll try to use the parsed token or fall back.

  return { agent, csrfToken };
}

/** Skip option for `describe` / `it` when DATABASE_URL is missing. */
export const skipWithoutDb: string | false = process.env.DATABASE_URL
  ? false
  : "DATABASE_URL not set — skipping test";
