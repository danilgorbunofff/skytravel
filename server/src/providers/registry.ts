// ──────────────────────────────────────────────
// Provider Registry — singleton Map store
// ──────────────────────────────────────────────

import type {
  TourProvider,
  FilterFieldDescriptor,
  CacheStatus,
} from "./types.js";

const providers = new Map<string, TourProvider>();

export function registerProvider(provider: TourProvider): void {
  if (providers.has(provider.id)) {
    throw new Error(
      `Provider "${provider.id}" is already registered. Duplicate registration is a bug.`,
    );
  }
  providers.set(provider.id, provider);
}

export function getProvider(id: string): TourProvider {
  const p = providers.get(id);
  if (!p) {
    throw new Error(`Unknown provider: "${id}"`);
  }
  return p;
}

export function getAllProviders(): Array<{
  id: string;
  label: string;
  supportsStreaming: boolean;
  filterFields: FilterFieldDescriptor[];
  cacheStatus: CacheStatus;
}> {
  return [...providers.values()].map((p) => ({
    id: p.id,
    label: p.label,
    supportsStreaming: p.supportsStreaming,
    filterFields: p.getProviderFilters(),
    cacheStatus: p.getCacheStatus(),
  }));
}
