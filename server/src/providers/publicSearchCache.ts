// Short-lived public search cache shared by public routes and provider syncs.

const resultCache = new Map<string, { data: unknown; ts: number }>();
const RESULT_CACHE_TTL = 30_000;
const RESULT_CACHE_MAX = 500;

export function getCachedPublicSearchResult(key: string): unknown | null {
  const entry = resultCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > RESULT_CACHE_TTL) {
    resultCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedPublicSearchResult(key: string, data: unknown): void {
  if (resultCache.size >= RESULT_CACHE_MAX) {
    const oldest = resultCache.keys().next().value;
    if (oldest) resultCache.delete(oldest);
  }
  resultCache.set(key, { data, ts: Date.now() });
}

export function invalidatePublicSearchCache(providerId?: string): void {
  if (!providerId) {
    resultCache.clear();
    return;
  }

  for (const key of resultCache.keys()) {
    if (key.startsWith(`${providerId}:`) || key.startsWith("destinations:")) resultCache.delete(key);
  }
}