import type { ProviderMeta, ProviderRegion, ToursResult, UnifiedFilters } from "../types/providers";

const API_URL = import.meta.env.VITE_API_URL || "";

function filtersToParams(filters: UnifiedFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(filters)) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  return params;
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new Error(
    (body as Record<string, string>)?.error || `Request failed with status ${res.status}`,
  );
}

export async function fetchPublicProviders(): Promise<ProviderMeta[]> {
  const res = await fetch(`${API_URL}/api/search/providers`);
  await throwIfNotOk(res);
  const data = await res.json();
  return data.providers as ProviderMeta[];
}

export async function fetchPublicProviderRegions(providerId: string): Promise<ProviderRegion[]> {
  const res = await fetch(`${API_URL}/api/search/providers/${encodeURIComponent(providerId)}/regions`);
  await throwIfNotOk(res);
  const data = await res.json();
  return data.items as ProviderRegion[];
}

export async function fetchPublicProviderTours(
  providerId: string,
  filters: UnifiedFilters,
): Promise<ToursResult> {
  const params = filtersToParams(filters);
  const res = await fetch(
    `${API_URL}/api/search/providers/${encodeURIComponent(providerId)}/tours?${params}`,
  );
  await throwIfNotOk(res);
  return res.json() as Promise<ToursResult>;
}