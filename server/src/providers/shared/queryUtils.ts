export function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  if (typeof value !== "string") return undefined;
  return value.trim();
}
