import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import ProviderFilterRenderer from "../components/admin/ProviderFilterRenderer";
import TourDetailDrawer from "../components/admin/TourDetailDrawer";
import {
  fetchProviderCacheStatus,
  refreshProviderCache,
  importProviderTours,
} from "../api/providers";
import { useSearchStore } from "../stores/searchStore";
import type {
  CacheStatus,
  ImportResult,
  ProviderMeta,
  ProviderRegion,
  UnifiedFilters,
  UnifiedTour,
} from "../types/providers";
import { formatPrice } from "../utils";
import "../admin.css";

// ── Labels ────────────────────────────────────────────────────────────────
const boardLabel: Record<string, string> = {
  AI: "All Inclusive",
  UAI: "Ultra AI",
  FB: "Plná penze",
  HB: "Polopenze",
  BB: "Snídaně",
  RO: "Bez stravy",
  SC: "Vlastní doprava",
};

const transportLabel: Record<string, string> = {
  plane: "✈ Letecky",
  bus: "🚌 Autobusem",
  train: "🚆 Vlakem",
  car: "🚗 Vlastní",
  boat: "🚢 Lodí",
};

function starsDisplay(stars: string | undefined): string {
  const n = parseInt(stars ?? "", 10);
  if (!n || n < 1 || n > 5) return "";
  return "★".repeat(n) + "☆".repeat(5 - n);
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("cs-CZ");
};

const PLACEHOLDER_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#e67e22", "#9b59b6",
  "#1abc9c", "#f39c12", "#d35400", "#2980b9", "#c0392b",
];
const placeholderColor = (dest: string) =>
  PLACEHOLDER_COLORS[dest.charCodeAt(0) % PLACEHOLDER_COLORS.length];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Check if a provider has two-level region selection (e.g. departure→destination) */
function hasTwoLevelRegions(provider: ProviderMeta): boolean {
  return provider.filterFields.some((f) => f.dependsOn != null);
}

export default function AdminSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Store state ──
  const providers = useSearchStore((s) => s.providers);
  const selectedProviderId = useSearchStore((s) => s.selectedProviderId);
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  );

  const regions = useSearchStore((s) => s.regions);
  const regionsLoading = useSearchStore((s) => s.regionsLoading);
  const selectedRegion = useSearchStore((s) => s.selectedRegion);
  const selectedSubRegion = useSearchStore((s) => s.selectedSubRegion);

  const cacheStatus = useSearchStore((s) => s.cacheStatus);

  const providerFilters = useSearchStore((s) => s.providerFilters);

  const search = useSearchStore((s) => s.search);
  const priceMin = useSearchStore((s) => s.priceMin);
  const priceMax = useSearchStore((s) => s.priceMax);
  const dateStart = useSearchStore((s) => s.dateStart);
  const dateEnd = useSearchStore((s) => s.dateEnd);
  const sortBy = useSearchStore((s) => s.sortBy);
  const sortDir = useSearchStore((s) => s.sortDir);
  const limit = useSearchStore((s) => s.limit);

  const tours = useSearchStore((s) => s.tours);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const totalCount = useSearchStore((s) => s.totalCount);
  const filteredCount = useSearchStore((s) => s.filteredCount);
  const page = useSearchStore((s) => s.page);
  const totalPages = useSearchStore((s) => s.totalPages);
  const uniqueDestinations = useSearchStore((s) => s.uniqueDestinations);

  // ── Store actions (stable refs — zustand actions never change) ──
  const {
    initProviders,
    changeProvider: storeChangeProvider,
    setSearch: storeSetSearch,
    setPriceMin: storeSetPriceMin,
    setPriceMax: storeSetPriceMax,
    setDateStart: storeSetDateStart,
    setDateEnd: storeSetDateEnd,
    setSortBy: storeSetSortBy,
    setSortDir: storeSetSortDir,
    setLimit: storeSetLimit,
    setProviderFilter: storeSetProviderFilter,
    clearFilters: storeClearFilters,
    setCacheStatus: storeSetCacheStatus,
    setSelectedRegion: storeSetSelectedRegion,
    setSelectedSubRegion: storeSetSelectedSubRegion,
    loadTours,
    resetTours,
  } = useSearchStore.getState();

  // ── Local-only state (doesn't need persistence across navigation) ──
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [detailTour, setDetailTour] = useState<UnifiedTour | null>(null);

  // ── Debounce ref ──
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Derived: two-level region helpers ──
  const isTwoLevel = selectedProvider ? hasTwoLevelRegions(selectedProvider) : false;

  // For two-level: unique departure cities from regions meta
  const departureCities = useMemo(() => {
    if (!isTwoLevel) return [];
    const map = new Map<number, string>();
    for (const r of regions) {
      const depId = r.meta?.departureId as number | undefined;
      const depName = r.meta?.departureName as string | undefined;
      if (depId != null && depName) map.set(depId, depName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [regions, isTwoLevel]);

  // For two-level: destination countries filtered by selected departure
  const destinationCountries = useMemo(() => {
    if (!isTwoLevel) return [];
    const filtered = selectedRegion
      ? regions.filter((r) => (r.meta?.departureId as number) === selectedRegion.id)
      : regions;
    const map = new Map<number, string>();
    for (const r of filtered) map.set(r.id, r.name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [regions, isTwoLevel, selectedRegion]);

  // ── Build filters ──
  const buildFilters = useCallback(
    (pageOverride?: number): UnifiedFilters => {
      const f: UnifiedFilters = {};
      if (search) f.q = search;
      if (priceMin) f.priceMin = Number(priceMin);
      if (priceMax) f.priceMax = Number(priceMax);
      if (dateStart) f.dateStart = dateStart;
      if (dateEnd) f.dateEnd = dateEnd;
      f.page = pageOverride ?? page;
      f.limit = limit;
      f.sortBy = sortBy;
      f.sortDir = sortDir;

      // Spread provider-specific filter values
      for (const [key, val] of Object.entries(providerFilters)) {
        if (val !== undefined && val !== null && val !== "") {
          f[key] = val;
        }
      }

      // Region context
      if (selectedProvider && !isTwoLevel && selectedRegion) {
        // Single-level: region id maps to the provider's main region filter key
        // For Alexandria it's "zeme", detect from filterFields or use region id
        const regionField = selectedProvider.filterFields.find(
          (ff) => ff.key === "zeme" || ff.key === "regionId",
        );
        if (regionField) {
          f[regionField.key] = selectedRegion.id;
        } else {
          f.zeme = selectedRegion.id;
        }
      } else if (isTwoLevel) {
        // Two-level: departure→destination
        if (selectedRegion) {
          const depField = selectedProvider?.filterFields.find((ff) => !ff.dependsOn && (ff.key === "townFrom" || ff.key.includes("town") || ff.key.includes("departure")));
          if (depField) f[depField.key] = selectedRegion.id;
          else f.townFrom = selectedRegion.id;
        }
        if (selectedSubRegion) {
          const destField = selectedProvider?.filterFields.find((ff) => ff.dependsOn != null);
          if (destField) f[destField.key] = selectedSubRegion.id;
          else f.stateId = selectedSubRegion.id;
        }
      }

      return f;
    },
    [
      search, priceMin, priceMax, dateStart, dateEnd, page, limit,
      sortBy, sortDir, providerFilters, selectedProvider, selectedRegion,
      selectedSubRegion, isTwoLevel,
    ],
  );

  // ── Load tours helper ──
  const doLoadTours = useCallback(
    (pageOverride?: number) => {
      if (!selectedProviderId) return;
      const filters = buildFilters(pageOverride);
      loadTours(selectedProviderId, filters);
    },
    [selectedProviderId, buildFilters, loadTours],
  );

  // ── Provider change handler ──
  const handleProviderChange = useCallback(
    async (providerId: string) => {
      setSearchParams({ provider: providerId }, { replace: true });
      setSelected(new Set());
      setDetailTour(null);
      setImportResult(null);
      await storeChangeProvider(providerId);
    },
    [storeChangeProvider, setSearchParams],
  );

  // ── Initial mount: init providers from store (only fetches once) ──
  useEffect(() => {
    const urlProvider = searchParams.get("provider");
    initProviders(urlProvider);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep URL param in sync with selected provider
  useEffect(() => {
    if (selectedProviderId && searchParams.get("provider") !== selectedProviderId) {
      setSearchParams({ provider: selectedProviderId }, { replace: true });
    }
  }, [selectedProviderId, searchParams, setSearchParams]);

  // ── Load tours when provider/region/subRegion changes ──
  // Only when the store has data but tours are empty (e.g. after initial load or provider change).
  // If we already have tours for this config, skip refetching (persist across navigation).
  const prevProviderRef = useRef<string>("");
  const prevRegionRef = useRef<number | null>(null);
  const prevSubRegionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedProviderId) return;

    const isProviderChange = prevProviderRef.current !== selectedProviderId;
    const isRegionChange = prevRegionRef.current !== (selectedRegion?.id ?? null);
    const isSubRegionChange = prevSubRegionRef.current !== (selectedSubRegion?.id ?? null);

    prevProviderRef.current = selectedProviderId;
    prevRegionRef.current = selectedRegion?.id ?? null;
    prevSubRegionRef.current = selectedSubRegion?.id ?? null;

    // Skip if nothing changed (e.g. remount with same state)
    if (!isProviderChange && !isRegionChange && !isSubRegionChange) return;

    doLoadTours(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProviderId, selectedRegion, selectedSubRegion]);

  // ── Cache status polling ──
  useEffect(() => {
    if (!selectedProviderId) return;
    const interval = setInterval(async () => {
      try {
        const status = await fetchProviderCacheStatus(selectedProviderId);
        storeSetCacheStatus(status);
      } catch {
        // ignore
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [selectedProviderId, storeSetCacheStatus]);

  // ── Handlers ──
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (priceMin && priceMax && Number(priceMin) > Number(priceMax)) {
      errors.price = "Minimální cena nesmí být větší než maximální.";
    }
    if (dateStart && dateEnd && dateStart > dateEnd) {
      errors.date = "Datum od nesmí být po datu do.";
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    doLoadTours(1);
  }

  function handleReset() {
    storeSetSearch("");
    storeSetPriceMin("");
    storeSetPriceMax("");
    storeSetDateStart("");
    storeSetDateEnd("");
    storeClearFilters();
    setSelected(new Set());
    setImportResult(null);
    setValidationErrors({});
    // Build filters manually with cleared values so the API call does not
    // use stale state (React batches the setX calls above into the next render).
    if (!selectedProviderId) return;
    const filters = buildFilters(1);
    delete filters.q;
    delete filters.priceMin;
    delete filters.priceMax;
    delete filters.dateStart;
    delete filters.dateEnd;
    // Remove every provider-specific key that was just cleared
    for (const ff of selectedProvider?.filterFields ?? []) {
      delete filters[ff.key];
    }
    loadTours(selectedProviderId, filters);
  }

  async function handleRefresh() {
    if (!selectedProviderId) return;
    await refreshProviderCache(selectedProviderId);
    try {
      const cache = await fetchProviderCacheStatus(selectedProviderId);
      storeSetCacheStatus(cache);
    } catch {
      // ignore
    }
    doLoadTours(1);
  }

  function handleRegionChange(region: ProviderRegion | null) {
    storeSetSelectedRegion(region);
    setSelected(new Set());
  }

  function handleSubRegionChange(region: ProviderRegion | null) {
    storeSetSelectedSubRegion(region);
    setSelected(new Set());
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setSelected(new Set());
    doLoadTours(newPage);
  }

  function handleLimitChange(newLimit: number) {
    storeSetLimit(newLimit);
    if (!selectedProviderId) return;
    const filters = buildFilters(1);
    filters.limit = newLimit;
    loadTours(selectedProviderId, filters);
  }

  function toggleSort(field: "price" | "date") {
    const newDir = sortBy === field ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    storeSetSortBy(field);
    storeSetSortDir(newDir);
    // We need to load with new sort — but state hasn't updated yet,
    // so build filters manually
    if (!selectedProviderId) return;
    const filters = buildFilters(1);
    filters.sortBy = field;
    filters.sortDir = newDir;
    loadTours(selectedProviderId, filters);
  }

  function handleProviderFilterChange(key: string, value: unknown) {
    storeSetProviderFilter(key, value);
  }

  function handleSearchDebounced(value: string) {
    storeSetSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      doLoadTours(1);
    }, 300);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === tours.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tours.map((t) => t.externalId)));
    }
  }

  async function handleImport(ids?: string[]) {
    if (!selectedProviderId) return;
    setImporting(true);
    setImportResult(null);
    try {
      const regionCtx: Record<string, unknown> = {};
      if (!isTwoLevel && selectedRegion) {
        const regionField = selectedProvider?.filterFields.find(
          (ff) => ff.key === "zeme" || ff.key === "regionId",
        );
        regionCtx[regionField?.key ?? "zeme"] = selectedRegion.id;
      } else if (isTwoLevel) {
        if (selectedRegion) {
          const depField = selectedProvider?.filterFields.find(
            (ff) => !ff.dependsOn && (ff.key === "townFrom" || ff.key.includes("town")),
          );
          regionCtx[depField?.key ?? "townFrom"] = selectedRegion.id;
        }
        if (selectedSubRegion) {
          const destField = selectedProvider?.filterFields.find((ff) => ff.dependsOn != null);
          regionCtx[destField?.key ?? "stateId"] = selectedSubRegion.id;
        }
      }
      const result = await importProviderTours(
        selectedProviderId,
        ids ?? [...selected],
        regionCtx,
      );
      setImportResult(result);
      if (result.ok) setSelected(new Set());
    } catch (err) {
      setImportResult({
        ok: false,
        created: 0,
        updated: 0,
        total: 0,
        message: err instanceof Error ? err.message : "Chyba při importu.",
      });
    } finally {
      setImporting(false);
    }
  }

  // ── Conditional columns ──
  const visibleColumns = useMemo(() => {
    const cols = { nights: false, pax: false, stars: false, board: false };
    for (const t of tours) {
      if (t.nights !== undefined) cols.nights = true;
      if (t.adults !== undefined) cols.pax = true;
      if (t.stars && t.stars !== "") cols.stars = true;
      if (t.board && t.board !== "") cols.board = true;
    }
    return cols;
  }, [tours]);

  // ── Dynamic grid columns (adjusts to which optional columns are visible) ──
  const gridCols = useMemo(() => {
    const c = ["40px", "56px", "1.4fr", "90px", "160px"];
    if (visibleColumns.nights) c.push("50px");
    if (visibleColumns.pax) c.push("55px");
    if (visibleColumns.board) c.push("110px");
    if (visibleColumns.stars) c.push("50px");
    c.push("110px"); // transport (always)
    c.push("44px");  // link (always)
    return c.join(" ");
  }, [visibleColumns]);

  // ── Active filter chips ──
  type FilterChip = { key: string; label: string; clear: () => void };
  const activeChips: FilterChip[] = (
    [
      search && {
        key: "q",
        label: `Hledám: „${search}"`,
        clear: () => { storeSetSearch(""); doLoadTours(1); },
      },
      priceMin && {
        key: "priceMin",
        label: `Cena od: ${formatPrice(Number(priceMin))}`,
        clear: () => { storeSetPriceMin(""); doLoadTours(1); },
      },
      priceMax && {
        key: "priceMax",
        label: `Cena do: ${formatPrice(Number(priceMax))}`,
        clear: () => { storeSetPriceMax(""); doLoadTours(1); },
      },
      dateStart && {
        key: "dateStart",
        label: `Od: ${fmtDate(dateStart)}`,
        clear: () => { storeSetDateStart(""); doLoadTours(1); },
      },
      dateEnd && {
        key: "dateEnd",
        label: `Do: ${fmtDate(dateEnd)}`,
        clear: () => { storeSetDateEnd(""); doLoadTours(1); },
      },
    ] as (FilterChip | false)[]
  ).filter(Boolean) as FilterChip[];

  const sortIcon = (field: "price" | "date") =>
    sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Pagination helper ──
  function pageNumbers(): (number | "…")[] {
    const pages: (number | "…")[] = [];
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - range && i <= page + range)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return pages;
  }

  // ── Import result message ──
  const importMessage = importResult
    ? importResult.ok
      ? `Import dokončen: ${importResult.created} nových, ${importResult.updated} aktualizovaných (celkem ${importResult.total}).`
      : importResult.message ?? "Import se nezdařil."
    : null;

  return (
    <AdminLayout title="Vyhledávání zájezdů">
      {/* ── Provider selector ───────────────────────── */}
      <section className="admin-card">
        <div className="alex-country-bar">
          <label><strong>Zdroj:</strong></label>
          <div className="alex-country-tabs">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`alex-country-tab${selectedProviderId === p.id ? " is-active" : ""}`}
                onClick={() => {
                  if (p.id !== selectedProviderId) handleProviderChange(p.id);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Region selector ───────────────────────── */}
      {regions.length > 0 && !regionsLoading && (
        <section className="admin-card">
          {!isTwoLevel ? (
            /* Single-level: flat country tabs */
            <div className="alex-country-bar">
              <label><strong>Země:</strong></label>
              <div className="alex-country-tabs">
                {regions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`alex-country-tab${selectedRegion?.id === r.id ? " is-active" : ""}`}
                    onClick={() => handleRegionChange(r)}
                  >
                    {r.name}
                    {r.count != null && (
                      <span className="alex-country-count">{r.count.toLocaleString("cs")}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Two-level: departure → destination dropdowns */
            <div className="orex-route-selects">
              <div className="orex-route-select-group">
                <label htmlFor="orexDeparture"><strong>Odletové město:</strong></label>
                <select
                  id="orexDeparture"
                  value={selectedRegion?.id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const city = id != null ? departureCities.find((c) => c.id === id) ?? null : null;
                    handleRegionChange(city ? { id: city.id, name: city.name } : null);
                  }}
                >
                  <option value="">Vše</option>
                  {departureCities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="orex-route-select-group">
                <label htmlFor="orexDestination"><strong>Destinace:</strong></label>
                <select
                  id="orexDestination"
                  value={selectedSubRegion?.id ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const dest = id != null ? destinationCountries.find((c) => c.id === id) ?? null : null;
                    handleSubRegionChange(dest ? { id: dest.id, name: dest.name } : null);
                  }}
                >
                  <option value="">Vše</option>
                  {destinationCountries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>
      )}

      {regionsLoading && (
        <section className="admin-card">
          <span className="alex-country-loading">Načítám regiony…</span>
        </section>
      )}

      {/* ── Filters ────────────────────────────────── */}
      <section className="admin-card">
        <h2>Filtrovat nabídky</h2>
        <form className="alex-filters" onSubmit={handleSearch}>

          {/* ─ Full-width search ─ */}
          <div className="alex-filter-field">
            <label htmlFor="searchQ">Hledat</label>
            <input
              id="searchQ"
              type="text"
              placeholder="Destinace, hotel…"
              value={search}
              onChange={(e) => handleSearchDebounced(e.target.value)}
            />
          </div>

          {/* ─ Range groups: price + date ─ */}
          <div className="alex-filter-groups">
            <div className={`alex-filter-group${validationErrors.price ? " has-error" : ""}`}>
              <span className="alex-filter-group-label">Cena (Kč)</span>
              <div className="alex-filter-group-row">
                <input
                  id="searchPriceMin"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Min"
                  aria-label="Cena od"
                  value={priceMin}
                  onChange={(e) => storeSetPriceMin(e.target.value)}
                />
                <span className="alex-filter-range-sep">–</span>
                <input
                  id="searchPriceMax"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Max"
                  aria-label="Cena do"
                  value={priceMax}
                  onChange={(e) => storeSetPriceMax(e.target.value)}
                />
              </div>
              {validationErrors.price && (
                <span className="alex-filter-error">⚠ {validationErrors.price}</span>
              )}
            </div>

            <div className={`alex-filter-group${validationErrors.date ? " has-error" : ""}`}>
              <span className="alex-filter-group-label">Termín odletu</span>
              <div className="alex-filter-group-row">
                <input
                  id="searchDateStart"
                  type="date"
                  aria-label="Datum od"
                  value={dateStart}
                  onChange={(e) => storeSetDateStart(e.target.value)}
                />
                <span className="alex-filter-range-sep">–</span>
                <input
                  id="searchDateEnd"
                  type="date"
                  aria-label="Datum do"
                  value={dateEnd}
                  onChange={(e) => storeSetDateEnd(e.target.value)}
                />
              </div>
              {validationErrors.date && (
                <span className="alex-filter-error">⚠ {validationErrors.date}</span>
              )}
            </div>
          </div>

          {/* ─ Provider-specific filters ─ */}
          {selectedProvider && selectedProvider.filterFields.length > 0 && (
            <>
              <hr className="alex-filter-divider" />
              <ProviderFilterRenderer
                fields={selectedProvider.filterFields}
                values={providerFilters}
                onChange={handleProviderFilterChange}
              />
            </>
          )}

          <div className="alex-filter-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Načítám…" : "Hledat"}
            </button>
            <button type="button" className="ghost" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="ghost refresh" onClick={handleRefresh} disabled={loading}>
              ↻ Obnovit feed
            </button>
          </div>
        </form>

        {activeChips.length > 0 && (
          <div className="alex-filter-chips">
            <span className="alex-chips-label">Aktivní filtry:</span>
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" className="alex-chip" onClick={chip.clear}>
                {chip.label} <span>×</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Import controls ────────────────────────── */}
      <section className="admin-card">
        <div className="alex-import-bar">
          <div className="alex-import-info">
            <span>
              {selected.size > 0
                ? `Vybráno ${selected.size} z ${tours.length}`
                : `Stránka ${page} z ${totalPages} (${filteredCount.toLocaleString("cs")} výsledků)`}
            </span>
            {importMessage && <p className="note">{importMessage}</p>}
          </div>
          <div className="alex-import-actions">
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => handleImport([...selected])}
                disabled={importing}
              >
                {importing ? "Importuji…" : `Importovat vybrané (${selected.size})`}
              </button>
            )}
            <button
              type="button"
              className={selected.size > 0 ? "ghost" : ""}
              onClick={() => handleImport(tours.map((t) => t.externalId))}
              disabled={importing || tours.length === 0}
            >
              {importing ? "Importuji…" : "Importovat vše"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Error ──────────────────────────────────── */}
      {error && (
        <section className="admin-card">
          <p className="note" style={{ color: "#d32f2f" }}>
            {error}
          </p>
        </section>
      )}

      {/* ── Results table ──────────────────────────── */}
      <section className="admin-card">
        <h2>Výsledky</h2>

        {/* Loading skeleton */}
        {loading && (
          <div className="table-skeleton">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        )}

        {/* Empty state */}
        {!loading && tours.length === 0 && (
          <div className="empty-state">
            <strong>Žádné nabídky</strong>
            <p>
              {!cacheStatus?.warm
                ? "Data se načítají… Zkuste obnovit feed tlačítkem ↻."
                : "Zkuste změnit filtry nebo obnovte feed tlačítkem ↻."}
            </p>
          </div>
        )}

        {/* Tour table */}
        {!loading && tours.length > 0 && (
          <div className="alex-table-wrap" style={{ "--alex-grid-cols": gridCols } as React.CSSProperties}>
            <div className="alex-table-header">
              <span className="alex-col-check">
                <input
                  type="checkbox"
                  checked={selected.size === tours.length && tours.length > 0}
                  onChange={toggleSelectAll}
                />
              </span>
              <span className="alex-col-img">Foto</span>
              <span className="alex-col-dest">Destinace / Hotel</span>
              <button
                type="button"
                className="alex-col-price alex-sort-btn"
                onClick={() => toggleSort("price")}
              >
                Cena{sortIcon("price")}
              </button>
              <button
                type="button"
                className="alex-col-dates alex-sort-btn"
                onClick={() => toggleSort("date")}
              >
                Termín{sortIcon("date")}
              </button>
              {visibleColumns.nights && <span className="alex-col-transport">Nocí</span>}
              {visibleColumns.pax && <span className="alex-col-people">Osoby</span>}
              {visibleColumns.board && <span className="alex-col-transport">Strava</span>}
              {visibleColumns.stars && <span className="alex-col-transport">Hvězdy</span>}
              <span className="alex-col-transport">Doprava</span>
              <span className="alex-col-link" />
            </div>

            {tours.map((tour) => (
              <div
                key={tour.externalId || `${tour.destination}-${tour.startDate}`}
                className={`alex-table-row${selected.has(tour.externalId) ? " is-selected" : ""}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("input, a")) return;
                  setDetailTour(tour);
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="alex-col-check">
                  <input
                    type="checkbox"
                    checked={selected.has(tour.externalId)}
                    onChange={() => toggleSelect(tour.externalId)}
                  />
                </span>
                <span className="alex-col-img">
                  {tour.image ? (
                    <img
                      src={tour.image}
                      alt={tour.destination}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="alex-no-img"
                      style={{ background: placeholderColor(tour.destination) }}
                    >
                      {tour.destination.charAt(0).toUpperCase()}
                    </div>
                  )}
                </span>
                <span className="alex-col-dest">
                  <strong>{tour.destination}</strong>
                  <small>{tour.title}</small>
                  <span className="alex-row-meta">
                    <span
                      className="alex-badge"
                      style={{
                        background: tour.source === "alexandria" ? "#dbeafe" : "#dcfce7",
                        color: tour.source === "alexandria" ? "#1d4ed8" : "#15803d",
                        fontSize: "0.65rem",
                      }}
                    >
                      {tour.source}
                    </span>
                    {tour.offersCount && tour.offersCount > 1 && (
                      <span className="alex-badge alex-badge--offers">
                        {tour.offersCount} nabídek
                      </span>
                    )}
                    {starsDisplay(tour.stars) && (
                      <span className="alex-badge alex-badge--stars">
                        {starsDisplay(tour.stars)}
                      </span>
                    )}
                    {tour.board && (
                      <span className="alex-badge alex-badge--board">
                        {boardLabel[tour.board] ?? tour.board}
                      </span>
                    )}
                  </span>
                </span>
                <span className="alex-col-price">
                  <strong>{formatPrice(tour.price)}</strong>
                  {tour.originalPrice > tour.price && (
                    <small className="alex-price-orig">
                      {formatPrice(tour.originalPrice)}
                    </small>
                  )}
                </span>
                <span className="alex-col-dates">
                  {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
                </span>
                {visibleColumns.nights && (
                  <span className="alex-col-transport">{tour.nights ?? "–"}</span>
                )}
                {visibleColumns.pax && (
                  <span className="alex-col-people">
                    {tour.adults !== undefined ? `${tour.adults}+${tour.children ?? 0}` : "–"}
                  </span>
                )}
                {visibleColumns.board && (
                  <span className="alex-col-transport">
                    {(boardLabel[tour.board] ?? tour.board) || "–"}
                  </span>
                )}
                {visibleColumns.stars && (
                  <span className="alex-col-transport">
                    {starsDisplay(tour.stars) || "–"}
                  </span>
                )}
                <span className="alex-col-transport">
                  {transportLabel[tour.transport] ?? tour.transport}
                </span>
                <span className="alex-col-link">
                  {tour.url && (
                    <a
                      href={tour.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alex-link-btn"
                      title="Otevřít nabídku"
                    >
                      ↗
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination / rows-per-page */}
        {!loading && tours.length > 0 && (
          <div className="alex-pagination">
            {totalPages > 1 && (
              <>
                <button
                  type="button"
                  className="alex-page-btn"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  ← Předchozí
                </button>

                <div className="alex-page-numbers">
                  {pageNumbers().map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="alex-page-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`alex-page-num${p === page ? " is-active" : ""}`}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  className="alex-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Další →
                </button>
              </>
            )}

            <select
              className="alex-page-limit"
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              <option value={25}>25 / stránka</option>
              <option value={50}>50 / stránka</option>
              <option value={100}>100 / stránka</option>
            </select>
          </div>
        )}
      </section>

      {/* ── Detail drawer ──────────────────────────── */}
      <TourDetailDrawer
        tour={detailTour}
        onClose={() => setDetailTour(null)}
        onImport={(externalId) => handleImport([externalId])}
        importing={importing}
      />
    </AdminLayout>
  );
}
