/** Safely cast unknown to string, returning fallback or empty string. */
export function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (val === null || val === undefined) return fallback;
  return String(val);
}

/** Safely cast unknown to number, returning undefined if not finite. */
export function safeNumber(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

/** Safely cast unknown to Date, returning undefined if invalid. */
export function safeDate(val: unknown): Date | undefined {
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}
