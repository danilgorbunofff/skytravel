// ──────────────────────────────────────────────
// Bootstrap cache — sessionStorage-backed SWR for
// providers + regions. Renders instantly on revisit,
// revalidates in the background.
// ──────────────────────────────────────────────

import type { ProviderMeta, ProviderRegion } from "../types/providers";
import { fetchPublicBootstrap, type PublicBootstrap } from "../api/publicProviders";

const STORAGE_KEY = "skytravel:bootstrap:v1";

type Cached = PublicBootstrap & { cachedAt: number };

function readCache(): Cached | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed || !Array.isArray(parsed.providers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: PublicBootstrap): void {
  try {
    const payload: Cached = { ...data, cachedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or serialization errors are non-fatal.
  }
}

export type BootstrapResult = {
  providers: ProviderMeta[];
  regionsByProvider: Record<string, ProviderRegion[]>;
  fromCache: boolean;
};

/** Returns cached bootstrap immediately (if any) and a promise that resolves
 *  to the freshly-fetched bootstrap. Callers can render from `cached` and then
 *  swap in `fresh` when it arrives. */
export function loadBootstrap(): {
  cached: BootstrapResult | null;
  fresh: Promise<BootstrapResult>;
} {
  const cached = readCache();
  const fresh = fetchPublicBootstrap()
    .then((data) => {
      writeCache(data);
      return {
        providers: data.providers,
        regionsByProvider: data.regionsByProvider,
        fromCache: false,
      };
    });

  return {
    cached: cached
      ? {
          providers: cached.providers,
          regionsByProvider: cached.regionsByProvider,
          fromCache: true,
        }
      : null,
    fresh,
  };
}
