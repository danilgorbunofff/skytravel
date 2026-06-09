import type { Request, Response } from "express";
import type { FilterFieldDescriptor } from "../providers/types.js";

export const SHARED_KEYS = new Set([
  "q",
  "priceMin",
  "priceMax",
  "dateStart",
  "dateEnd",
  "nights",
  "stars",
  "board",
  "adults",
  "children",
  "transport",
  "hotelOnly",
  "sortBy",
  "sortDir",
  "page",
  "limit",
  "offerGroupKey",
  "destinationSlug",
  "refresh",
]);

const MAX_QUERY_LENGTH = 120;

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  if (typeof value !== "string") return undefined;
  return value.trim();
}

export function validateProviderFilters(
  req: Request,
  res: Response,
  fields: FilterFieldDescriptor[],
  sharedKeys?: Set<string>,
): Record<string, unknown> | undefined {
  const allowed = new Map(fields.map((field) => [field.key, field]));
  const providerFilters: Record<string, unknown> = {};
  const keys = sharedKeys ?? SHARED_KEYS;

  for (const key of Object.keys(req.query)) {
    if (keys.has(key)) continue;
    const field = allowed.get(key);
    if (!field) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: `Unsupported filter: ${key}.` } });
      return undefined;
    }

    const raw = firstQueryValue(req.query[key]);
    if (!raw) continue;
    if (raw.length > MAX_QUERY_LENGTH) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: `${key} is too long.` } });
      return undefined;
    }

    if (field.type === "number") {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: `${key} must be a number.` } });
        return undefined;
      }
      providerFilters[key] = numeric;
      continue;
    }

    if (field.options && field.options.length > 0) {
      const valid = field.options.some((option) => String(option.value) === raw);
      if (!valid) {
        res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: `${key} has an unsupported value.` } });
        return undefined;
      }
    }

    providerFilters[key] = raw;
  }

  return providerFilters;
}
