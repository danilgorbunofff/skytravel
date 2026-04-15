import { create } from "zustand";
import {
  fetchProviders,
  fetchProviderRegions,
  fetchProviderCacheStatus,
  fetchProviderTours,
  streamProviderTours,
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

  // Streaming
  streaming: boolean;
  streamLoaded: number;

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
  loadToursStream: (providerId: string, filters: UnifiedFilters) => void;
  cancelStream: () => void;
  resetTours: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

function hasTwoLevelRegions(provider: ProviderMeta): boolean {
  return provider.filterFields.some((f) => f.dependsOn != null);
}

function findOrextravelDefaults(
  regionData: ProviderRegion[],
): { region: ProviderRegion | null; subRegion: ProviderRegion | null } {
  const depMap = new Map<number, string>();
  for (const r of regionData) {
    const depId = r.meta?.departureId as number | undefined;
    const depName = r.meta?.departureName as string | undefined;
    if (depId != null && depName) depMap.set(depId, depName);
  }
  const pragueEntry = [...depMap.entries()].find(([, name]) => /prah|prag/i.test(name));
  if (!pragueEntry) return { region: null, subRegion: null };
  const region: ProviderRegion = { id: pragueEntry[0], name: pragueEntry[1] };
  const dests = regionData.filter((r) => (r.meta?.departureId as number) === pragueEntry[0]);
  const destMap = new Map<number, string>();
  for (const r of dests) destMap.set(r.id, r.name);
  const turkeyEntry = [...destMap.entries()].find(([, name]) => /turecko|turkey|türk/i.test(name));
  const subRegion = turkeyEntry ? { id: turkeyEntry[0], name: turkeyEntry[1] } : null;
  return { region, subRegion };
}

// ── Store ────────────────────────────────────────────────────

/** Ref for the active stream close function — lives outside the store
 *  so it's never serialized / compared. */
let _streamClose: (() => void) | null = null;

/** AbortController for the latest loadTours fetch — lets us cancel stale requests. */
let _loadAbort: AbortController | null = null;

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
  streaming: false,
  streamLoaded: 0,
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
      const providerList = await fetchProviders();
      const initialId =
        providerList.find((p) => p.id === urlProvider)?.id ??
        providerList[0]?.id ??
        "";
      set({ providers: providerList, providersLoaded: true, selectedProviderId: initialId });
      if (initialId) {
        await get().loadRegions(initialId);
      }
    } catch {
      // ignore
    }
  },

  changeProvider: async (providerId) => {
    get().cancelStream();
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
      streaming: false,
      streamLoaded: 0,
    });
    await get().loadRegions(providerId);
  },

  loadRegions: async (providerId) => {
    set({ regionsLoading: true });
    try {
      const [regionData, cache] = await Promise.all([
        fetchProviderRegions(providerId),
        fetchProviderCacheStatus(providerId),
      ]);
      const provider = get().providers.find((p) => p.id === providerId);
      const twoLevel = provider ? hasTwoLevelRegions(provider) : false;

      let selectedRegion: ProviderRegion | null = null;
      let selectedSubRegion: ProviderRegion | null = null;

      if (twoLevel) {
        const defs = findOrextravelDefaults(regionData);
        selectedRegion = defs.region;
        selectedSubRegion = defs.subRegion;
      } else if (regionData.length > 0) {
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
      const next = { ...s.providerFilters };
      if (value === undefined) delete next[key];
      else next[key] = value;
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

  loadToursStream: (providerId, filters) => {
    // Cancel previous stream
    get().cancelStream();

    set({
      streaming: true,
      streamLoaded: 0,
      tours: [],
      error: null,
    });

    const close = streamProviderTours(providerId, filters, {
      onBatch(items, loaded) {
        set((s) => ({
          tours: [...s.tours, ...items],
          streamLoaded: loaded,
        }));
      },
      onDone() {
        set({ streaming: false });
        _streamClose = null;
        // Fetch the properly sorted/paginated first page
        get().loadTours(providerId, filters);
      },
      onError(err) {
        set({ streaming: false, error: err.message });
        _streamClose = null;
      },
    });

    _streamClose = close;
  },

  cancelStream: () => {
    _streamClose?.();
    _streamClose = null;
  },

  resetTours: () => {
    get().cancelStream();
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
      streaming: false,
      streamLoaded: 0,
    });
  },
}));
