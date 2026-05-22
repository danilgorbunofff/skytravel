import type { Response } from "express";
import { ApiError } from "./ApiError.js";

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

export function fail(code: string, message: string, status = 400): never {
  throw new ApiError(code, message, status);
}
