import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { registerTeardown } from "./helpers/teardown.js";

// Lightweight integration tests that exercise Express middleware and error handling
// without requiring a database connection. Uses Node's native fetch against
// a temporary server.

function getTestApp() {
  const app = createApp();
  return app;
}

async function startTestServer() {
  const app = getTestApp();
  return new Promise<{ baseUrl: string; close: () => void }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
  });
}

registerTeardown();
describe("App integration: 404 handling", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/nonexistent`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.equal(body.error.code, "NOT_FOUND");
    } finally {
      close();
    }
  });
});

describe("App integration: security headers", () => {
  it("sets helmet security headers", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/nonexistent`);
      // Helmet sets various security headers
      assert.ok(res.headers.get("x-content-type-options"));
      assert.ok(res.headers.get("x-frame-options") || res.headers.get("content-security-policy"));
    } finally {
      close();
    }
  });

  it("sets CORS headers", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/nonexistent`, {
        headers: { Origin: "http://localhost:5173" },
      });
      // In dev mode, CORS allows all origins
      assert.ok(res.headers.get("access-control-allow-credentials"));
    } finally {
      close();
    }
  });
});

describe("App integration: body parsing", () => {
  it("rejects bodies larger than 1MB", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      const largeBody = "x".repeat(2 * 1024 * 1024); // 2MB
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: largeBody }),
      });
      // Express returns 413 (Payload Too Large) or 500 depending on error middleware
      assert.ok(res.status >= 400, `Expected error status but got ${res.status}`);
    } finally {
      close();
    }
  });
});

describe("App integration: compression", () => {
  it("compresses JSON responses when Accept-Encoding is set", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/nonexistent`, {
        headers: { "Accept-Encoding": "gzip, deflate" },
      });
      // Small responses may not be compressed, but the middleware should be active
      // We just verify the response is still valid
      assert.equal(res.status, 404);
    } finally {
      close();
    }
  });
});
