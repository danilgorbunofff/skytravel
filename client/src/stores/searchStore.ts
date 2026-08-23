import { create } from "zustand";
import {
  fetchAdminBootstrap,
  fetchProviders,
  fetchProviderRegions,
  fetchProviderCacheStatus,
  fetchProviderTours,
} from "../api/providers";
import type {
  CacheStatus,
  ProviderMeta,
  ProviderRegion,
  UnifiedFilters,
  UnifiedTour,
} from "../types/providers";

// ── Types ────────────────────────────────────────────────────

export interface SearchState {
  // Provider
  providers: ProviderMeta[];
  selectedProviderId: string;
  providersLoaded: boolean;

  // Regions
  regions: ProviderRegion[];
  regionsLoading: boolean;
  selectedRegion: ProviderRegion | null;
  selectedSubRegion: ProviderRegion | null;

  // Cache
  cacheStatus: CacheStatus | null;

  // Tours
  tours: UnifiedTour[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  filteredCount: number;
  page: number;
  totalPages: number;
  uniqueDestinations: number;

  // Shared filters
  search: string;
  priceMin: string;
  priceMax: string;
  dateStart: string;
  dateEnd: string;
  sortBy: "price" | "date";
  sortDir: "asc" | "desc";
  limit: number;

  // Provider-specific filters
  providerFilters: Record<string, unknown>;

  // Actions
  initProviders: (urlProvider: string | null) => Promise<void>;
  changeProvider: (providerId: string) => Promise<void>;
  loadRegions: (providerId: string) => Promise<void>;
  setSelectedRegion: (region: ProviderRegion | null) => void;
  setSelectedSubRegion: (region: ProviderRegion | null) => void;
  setSearch: (value: string) => void;
  setPriceMin: (value: string) => void;
  setPriceMax: (value: string) => void;
  setDateStart: (value: string) => void;
  setDateEnd: (value: string) => void;
  setSortBy: (value: "price" | "date") => void;
  setSortDir: (value: "asc" | "desc") => void;
  setLimit: (value: number) => void;
  setProviderFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  setCacheStatus: (status: CacheStatus | null) => void;
  loadTours: (providerId: string, filters: UnifiedFilters) => Promise<void>;
  resetTours: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function hasTwoLevelRegions(provider: ProviderMeta): boolean {
  return provider.filterFields.some((f) => f.dependsOn != null);
}

// ── Store ────────────────────────────────────────────────────

/** AbortController for the latest loadTours fetch — lets us cancel stale requests. */
let _loadAbort: AbortController | null = null;

/** Regions hydrated from the admin bootstrap response, keyed by providerId.
 *  Used as a fast path inside loadRegions so the second region fetch (after
 *  selecting initial provider) skips the HTTP round-trip entirely. */
let _bootstrappedRegions: Record<string, ProviderRegion[]> | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  // ── Initial state ──
  providers: [],
  selectedProviderId: "",
  providersLoaded: false,
  regions: [],
  regionsLoading: false,
  selectedRegion: null,
  selectedSubRegion: null,
  cacheStatus: null,
  tours: [],
  loading: false,
  error: null,
  totalCount: 0,
  filteredCount: 0,
  page: 1,
  totalPages: 0,
  uniqueDestinations: 0,
  search: "",
  priceMin: "",
  priceMax: "",
  dateStart: "",
  dateEnd: "",
  sortBy: "price",
  sortDir: "asc",
  limit: 50,
  providerFilters: {},

  // ── Actions ──

  initProviders: async (urlProvider) => {
    if (get().providersLoaded) return; // already initialized
    try {
      // Single round-trip: fetch providers + all regions together.
      const { providers: providerList, regionsByProvider } = await fetchAdminBootstrap();
      const initialId =
        providerList.find((p) => p.id === urlProvider)?.id ?? providerList[0]?.id ?? "";
      set({ providers: providerList, providersLoaded: true, selectedProviderId: initialId });
      if (initialId) {
        // Hydrate regions immediately from bootstrap (no extra HTTP call).
        _bootstrappedRegions = regionsByProvider;
        await get().loadRegions(initialId);
      }
    } catch {
      // Fall back to legacy two-step path on bootstrap failure.
      try {
        const providerList = await fetchProviders();
        const initialId =
          providerList.find((p) => p.id === urlProvider)?.id ?? providerList[0]?.id ?? "";
        set({ providers: providerList, providersLoaded: true, selectedProviderId: initialId });
        if (initialId) await get().loadRegions(initialId);
      } catch {
        // ignore
      }
    }
  },

  changeProvider: async (providerId) => {
    set({
      selectedProviderId: providerId,
      providerFilters: {},
      tours: [],
      loading: false,
      error: null,
      totalCount: 0,
      filteredCount: 0,
      page: 1,
      totalPages: 0,
      uniqueDestinations: 0,
    });
    await get().loadRegions(providerId);
  },

  loadRegions: async (providerId) => {
    set({ regionsLoading: true });
    try {
      const preloaded = _bootstrappedRegions?.[providerId];
      const [regionData, cache] = await Promise.all([
        preloaded ? Promise.resolve(preloaded) : fetchProviderRegions(providerId),
        fetchProviderCacheStatus(providerId),
      ]);
      const provider = get().providers.find((p) => p.id === providerId);
      const _twoLevel = provider ? hasTwoLevelRegions(provider) : false;

      let selectedRegion: ProviderRegion | null = null;
      const selectedSubRegion: ProviderRegion | null = null;

      if (regionData.length > 0) {
        selectedRegion = regionData[0];
      }

      set({
        regions: regionData,
        cacheStatus: cache,
        selectedRegion,
        selectedSubRegion,
        regionsLoading: false,
      });
    } catch {
      set({
        regions: [],
        cacheStatus: null,
        selectedRegion: null,
        selectedSubRegion: null,
        regionsLoading: false,
      });
    }
  },

  setSelectedRegion: (region) => set({ selectedRegion: region, selectedSubRegion: null }),
  setSelectedSubRegion: (region) => set({ selectedSubRegion: region }),
  setSearch: (value) => set({ search: value }),
  setPriceMin: (value) => set({ priceMin: value }),
  setPriceMax: (value) => set({ priceMax: value }),
  setDateStart: (value) => set({ dateStart: value }),
  setDateEnd: (value) => set({ dateEnd: value }),
  setSortBy: (value) => set({ sortBy: value }),
  setSortDir: (value) => set({ sortDir: value }),
  setLimit: (value) => set({ limit: value }),
  setCacheStatus: (status) => set({ cacheStatus: status }),
  setProviderFilter: (key, value) =>
    set((s) => {
      if (value === undefined) {
        const { [key]: _, ...rest } = s.providerFilters;
        return { providerFilters: rest };
      }
      const next = { ...s.providerFilters };
      next[key] = value;
      return { providerFilters: next };
    }),

  clearFilters: () =>
    set({
      search: "",
      priceMin: "",
      priceMax: "",
      dateStart: "",
      dateEnd: "",
      providerFilters: {},
    }),

  loadTours: async (providerId, filters) => {
    // Cancel previous in-flight request
    _loadAbort?.abort();
    _loadAbort = new AbortController();

    set({ loading: true, error: null });
    try {
      const result = await fetchProviderTours(providerId, filters);
      // Only apply if this is still the latest request
      if (!_loadAbort.signal.aborted) {
        set({
          tours: result.items,
          totalCount: result.total,
          filteredCount: result.filtered,
          page: result.page,
          totalPages: result.totalPages,
          uniqueDestinations: result.uniqueDestinations ?? 0,
          loading: false,
        });
      }
    } catch (err) {
      if (!_loadAbort?.signal.aborted) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    }
  },

  resetTours: () => {
    _loadAbort?.abort();
    set({
      tours: [],
      loading: false,
      error: null,
      totalCount: 0,
      filteredCount: 0,
      page: 1,
      totalPages: 0,
      uniqueDestinations: 0,
    });
  },
}));
