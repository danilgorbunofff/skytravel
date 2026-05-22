import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./ApiError.js";

describe("ApiError", () => {
  it("sets code, message, and default status", () => {
    const err = new ApiError("VALIDATION_ERROR", "Invalid input");
    assert.equal(err.code, "VALIDATION_ERROR");
    assert.equal(err.message, "Invalid input");
    assert.equal(err.status, 400);
  });

  it("accepts custom status", () => {
    const err = new ApiError("NOT_FOUND", "Tour not found", 404);
    assert.equal(err.status, 404);
  });

  it("extends Error", () => {
    const err = new ApiError("TEST", "test");
    assert(err instanceof Error);
  });

  it("has name set to ApiError", () => {
    const err = new ApiError("TEST", "test");
    assert.equal(err.name, "ApiError");
  });
});
