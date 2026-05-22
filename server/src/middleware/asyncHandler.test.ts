import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { asyncHandler } from "./asyncHandler.js";

describe("asyncHandler", () => {
  function mockReq() {
    return {} as unknown as Request;
  }
  function mockRes() {
    return {} as unknown as Response;
  }

  it("calls next with error when async function rejects", async () => {
    const error = new Error("test error");
    const handler = asyncHandler(async () => {
      throw error;
    });

    let capturedError: unknown;
    const next = (err: unknown) => {
      capturedError = err;
    };

    await handler(mockReq(), mockRes(), next);
    // Give the microtask queue a tick
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(capturedError, error);
  });

  it("does not call next when async function resolves", async () => {
    const handler = asyncHandler(async () => {
      // success path
    });

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await handler(mockReq(), mockRes(), next);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(nextCalled, false);
  });
});
