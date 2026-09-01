import type {
  CacheStatus,
  ImportResult,
  ProviderMeta,
  ProviderRegion,
  ToursResult,
  UnifiedFilters,
} from "../types/providers";
import { safeParseJSON } from "./safeParseJSON";
import { csrfFetch } from "../lib/csrf";

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
  const body = (await safeParseJSON(res).catch(() => ({}))) as Record<string, string>;
  throw new Error(
    (body as Record<string, string>)?.error || `Request failed with status ${res.status}`,
  );
}

// ── API functions ────────────────────────────────────────────

export async function fetchProviders(): Promise<ProviderMeta[]> {
  const res = await fetch(`${API_URL}/api/admin/providers`, {
    credentials: "include",
  });
  await throwIfNotOk(res);
  const data = await safeParseJSON<{ providers: ProviderMeta[] }>(res, "poskytovatelé");
  return data.providers as ProviderMeta[];
}

export async function fetchProviderRegions(providerId: string): Promise<ProviderRegion[]> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/regions`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  const body = await safeParseJSON<{ data?: { items?: ProviderRegion[] } }>(
    res,
    "regiony poskytovatele",
  );
  return (body.data?.items ?? []) as ProviderRegion[];
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
  const body = await safeParseJSON<{ data?: ToursResult }>(res, "zájezdy poskytovatele");
  if (!body.data) throw new Error("Neplatná odpověď serveru (zájezdy poskytovatele).");
  return body.data;
}

export async function importProviderTours(
  providerId: string,
  ids: string[],
  regionCtx?: Record<string, unknown>,
): Promise<ImportResult> {
  const res = await csrfFetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/import`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, regionCtx: regionCtx ?? {} }),
    },
  );
  await throwIfNotOk(res);
  const body = await safeParseJSON<{ data?: ImportResult }>(res, "import zájezdů");
  if (!body.data) throw new Error("Neplatná odpověď serveru (import zájezdů).");
  return body.data;
}

export async function refreshProviderCache(providerId: string): Promise<void> {
  const res = await csrfFetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/refresh`,
    { method: "POST" },
  );
  await throwIfNotOk(res);
}

export async function fetchProviderCacheStatus(providerId: string): Promise<CacheStatus> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/cache-status`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  const body = await safeParseJSON<{ data?: CacheStatus }>(res, "stav cache");
  if (!body.data) throw new Error("Neplatná odpověď serveru (stav cache).");
  return body.data;
}

export type AdminBootstrap = {
  providers: ProviderMeta[];
  regionsByProvider: Record<string, ProviderRegion[]>;
};

export async function fetchAdminBootstrap(): Promise<AdminBootstrap> {
  const res = await fetch(`${API_URL}/api/admin/providers/bootstrap`, {
    credentials: "include",
  });
  await throwIfNotOk(res);
  const body = await safeParseJSON<{ data?: AdminBootstrap }>(res, "admin inicializace");
  if (!body.data) throw new Error("Neplatná odpověď serveru (admin inicializace).");
  return {
    providers: body.data.providers as ProviderMeta[],
    regionsByProvider: body.data.regionsByProvider as Record<string, ProviderRegion[]>,
  };
}
