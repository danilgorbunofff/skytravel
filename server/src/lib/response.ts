import type { Response } from "express";
import { ApiError } from "./ApiError.js";

/**
 * Send a successful JSON response.
 *
 * @param res - Express response object
 * @param data - Response payload
 * @param status - HTTP status code (default 200)
 * @example
 * success(res, { id: 1, name: "Alice" });
 */
export function success<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; pageSize: number; totalPages: number },
): void {
  res.status(200).json({ ok: true, data, meta });
}

/**
 * Throw an API error that will be caught by error-handling middleware.
 *
 * @param code - Machine-readable error code
 * @param message - Human-readable error description
 * @param status - HTTP status code (default 400)
 * @throws ApiError always
 * @example
 * fail("VALIDATION_ERROR", "Email is required", 422);
 */
export function fail(code: string, message: string, status = 400): never {
  throw new ApiError(code, message, status);
}
