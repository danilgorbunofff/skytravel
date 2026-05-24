import type {
  ProviderMeta,
  ProviderRegion,
  PublicDestinationSummary,
  ToursResult,
  UnifiedFilters,
  UnifiedTour,
} from "../types/providers";

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
  const rawError = (body as Record<string, unknown>)?.error;
  const message =
    typeof rawError === "string"
      ? rawError
      : rawError && typeof rawError === "object" && "message" in rawError
        ? String((rawError as { message: unknown }).message)
        : `Request failed with status ${res.status}`;
  throw new Error(message);
}

export async function fetchPublicProviders(): Promise<ProviderMeta[]> {
  const res = await fetch(`${API_URL}/api/search/providers`);
  await throwIfNotOk(res);
  const data = await res.json();
  return data.providers as ProviderMeta[];
}

export type PublicBootstrap = {
  providers: ProviderMeta[];
  regionsByProvider: Record<string, ProviderRegion[]>;
  version: string;
};

export async function fetchPublicBootstrap(): Promise<PublicBootstrap> {
  const res = await fetch(`${API_URL}/api/search/bootstrap`);
  await throwIfNotOk(res);
  const data = await res.json();
  return {
    providers: data.providers as ProviderMeta[],
    regionsByProvider: data.regionsByProvider as Record<string, ProviderRegion[]>,
    version: String(data.version ?? ""),
  };
}

export async function fetchPublicDestinations(
  providerId?: string,
): Promise<PublicDestinationSummary[]> {
  const params = new URLSearchParams();
  if (providerId) params.set("providerId", providerId);
  const query = params.toString();
  const res = await fetch(`${API_URL}/api/search/destinations${query ? `?${query}` : ""}`);
  await throwIfNotOk(res);
  const data = await res.json();
  return data.items as PublicDestinationSummary[];
}

export async function fetchPublicProviderRegions(
  providerId: string,
  filters?: UnifiedFilters,
): Promise<ProviderRegion[]> {
  const params = filters ? filtersToParams(filters) : new URLSearchParams();
  const query = params.toString();
  const res = await fetch(
    `${API_URL}/api/search/providers/${encodeURIComponent(providerId)}/regions${query ? `?${query}` : ""}`,
  );
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

export async function fetchPublicAllProviderTours(
  filters: UnifiedFilters,
  signal?: AbortSignal,
): Promise<ToursResult> {
  const params = filtersToParams(filters);
  const res = await fetch(`${API_URL}/api/search/all/tours?${params}`, { signal });
  await throwIfNotOk(res);
  return res.json() as Promise<ToursResult>;
}

export async function fetchPublicProviderOfferGroup(
  providerId: string,
  offerGroupKey: string,
  filters: UnifiedFilters,
  signal?: AbortSignal,
): Promise<UnifiedTour[]> {
  const params = filtersToParams(filters);
  params.set("offerGroupKey", offerGroupKey);
  const res = await fetch(
    `${API_URL}/api/search/providers/${encodeURIComponent(providerId)}/offer-group?${params}`,
    { signal },
  );
  await throwIfNotOk(res);
  const data = await res.json();
  return data.items as UnifiedTour[];
}

export async function fetchPublicSingleTour(
  providerId: string,
  externalId: string,
): Promise<UnifiedTour> {
  const res = await fetch(
    `${API_URL}/api/search/tour/${encodeURIComponent(providerId)}/${encodeURIComponent(externalId)}`,
  );
  await throwIfNotOk(res);
  const data = await res.json();
  return data.tour as UnifiedTour;
}
