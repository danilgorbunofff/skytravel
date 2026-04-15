import type {
  CacheStatus,
  ImportResult,
  ProviderMeta,
  ProviderRegion,
  ToursResult,
  UnifiedFilters,
} from "../types/providers";

const API_URL = import.meta.env.VITE_API_URL || "";

// ── helpers ──────────────────────────────────────────────────

function filtersToParams(filters: UnifiedFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(filters)) {
    const val = filters[key];
    if (val === undefined || val === null || val === "") continue;
    params.append(key, String(val));
  }
  return params;
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new Error(
    (body as Record<string, string>)?.error ||
      `Request failed with status ${res.status}`,
  );
}

// ── API functions ────────────────────────────────────────────

export async function fetchProviders(): Promise<ProviderMeta[]> {
  const res = await fetch(`${API_URL}/api/admin/providers`, {
    credentials: "include",
  });
  await throwIfNotOk(res);
  const data = await res.json();
  return data.providers as ProviderMeta[];
}

export async function fetchProviderRegions(
  providerId: string,
): Promise<ProviderRegion[]> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/regions`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  const data = await res.json();
  return data.items as ProviderRegion[];
}

export async function fetchProviderTours(
  providerId: string,
  filters: UnifiedFilters,
): Promise<ToursResult> {
  const params = filtersToParams(filters);
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/tours?${params}`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<ToursResult>;
}

export async function importProviderTours(
  providerId: string,
  ids: string[],
  regionCtx?: Record<string, unknown>,
): Promise<ImportResult> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/import`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids, regionCtx: regionCtx ?? {} }),
    },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<ImportResult>;
}

export async function refreshProviderCache(
  providerId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/refresh`,
    { method: "POST", credentials: "include" },
  );
  await throwIfNotOk(res);
}

export async function fetchProviderCacheStatus(
  providerId: string,
): Promise<CacheStatus> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/cache-status`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<CacheStatus>;
}


