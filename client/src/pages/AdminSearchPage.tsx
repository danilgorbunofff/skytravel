import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import ProviderSelector from "../components/admin/ProviderSelector";
import RegionPicker from "../components/admin/RegionPicker";
import TourFilterBar from "../components/admin/TourFilterBar";
import TourDataTable from "../components/admin/TourDataTable";
import ImportPanel from "../components/admin/ImportPanel";
import TourDetailDrawer from "../components/admin/TourDetailDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkipToContent } from "../components/SkipToContent";
import {
  fetchProviderCacheStatus,
  refreshProviderCache,
  importProviderTours,
} from "../api/providers";
import { useSearchStore } from "../stores/searchStore";
import type {
  ImportResult,
  ProviderMeta,
  ProviderRegion,
  UnifiedFilters,
  UnifiedTour,
} from "../types/providers";
import { formatPrice } from "../utils";
import { fmtDate } from "../lib/formatters";
import "../admin.css";

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
  const filteredCount = useSearchStore((s) => s.filteredCount);
  const page = useSearchStore((s) => s.page);
  const totalPages = useSearchStore((s) => s.totalPages);

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
  } = useSearchStore.getState();

  // ── Local-only state (doesn't need persistence across navigation) ──
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [detailTour, setDetailTour] = useState<UnifiedTour | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"selected" | "all" | null>(null);

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
        const regionField = selectedProvider.filterFields.find(
          (ff) => ff.key === "zeme" || ff.key === "regionId",
        );
        if (regionField) {
          f[regionField.key] = selectedRegion.id;
        } else {
          f.zeme = selectedRegion.id;
        }
      } else if (isTwoLevel) {
        if (selectedRegion) {
          const depField = selectedProvider?.filterFields.find(
            (ff) =>
              !ff.dependsOn &&
              (ff.key === "townFrom" || ff.key.includes("town") || ff.key.includes("departure")),
          );
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
      search,
      priceMin,
      priceMax,
      dateStart,
      dateEnd,
      page,
      limit,
      sortBy,
      sortDir,
      providerFilters,
      selectedProvider,
      selectedRegion,
      selectedSubRegion,
      isTwoLevel,
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
    const providerKeys = (selectedProvider?.filterFields ?? []).map((ff) => ff.key);
    const keysToRemove = new Set<string>([
      "q",
      "priceMin",
      "priceMax",
      "dateStart",
      "dateEnd",
      ...providerKeys,
    ]);
    const cleaned = Object.fromEntries(
      Object.entries(filters).filter(([k]) => !keysToRemove.has(k)),
    ) as UnifiedFilters;
    loadTours(selectedProviderId, cleaned);
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

  function handleSearchDebounced(value: string) {
    storeSetSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      doLoadTours(1);
    }, 300);
  }

  function handleRegionChange(region: ProviderRegion | null) {
    storeSetSelectedRegion(region);
    setSelected(new Set());
  }

  function handleSubRegionChange(region: ProviderRegion | null) {
    storeSetSelectedSubRegion(region);
    setSelected(new Set());
  }

  function handleProviderFilterChange(key: string, value: unknown) {
    storeSetProviderFilter(key, value);
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

  function handleSortToggle(field: "price" | "date") {
    const newDir = sortBy === field ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    storeSetSortBy(field);
    storeSetSortDir(newDir);
    if (!selectedProviderId) return;
    const filters = buildFilters(1);
    filters.sortBy = field;
    filters.sortDir = newDir;
    loadTours(selectedProviderId, filters);
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
      const result = await importProviderTours(selectedProviderId, ids ?? [...selected], regionCtx);
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

  function handleImportSelected() {
    setImportMode("selected");
    setConfirmImportOpen(true);
  }

  function handleImportAll() {
    setImportMode("all");
    setConfirmImportOpen(true);
  }

  function handleConfirmImport() {
    if (importMode === "selected") {
      handleImport([...selected]);
    } else if (importMode === "all") {
      handleImport(tours.map((t) => t.externalId));
    }
    setConfirmImportOpen(false);
    setImportMode(null);
  }

  function exportToursCsv() {
    const header = ["ID", "Title", "Destination", "Date", "Price", "Board", "Transport"];
    const rows = tours.map((tour) => [
      tour.externalId,
      tour.title,
      tour.destination,
      `${tour.startDate} - ${tour.endDate}`,
      String(tour.price),
      tour.board || "",
      tour.transport || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skytravel-tours-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // ── Active filter chips ──
  type FilterChip = { key: string; label: string; clear: () => void };
  const activeChips: FilterChip[] = (
    [
      search && {
        key: "q",
        label: `Hledám: „${search}"`,
        clear: () => {
          storeSetSearch("");
          doLoadTours(1);
        },
      },
      priceMin && {
        key: "priceMin",
        label: `Cena od: ${formatPrice(Number(priceMin))}`,
        clear: () => {
          storeSetPriceMin("");
          doLoadTours(1);
        },
      },
      priceMax && {
        key: "priceMax",
        label: `Cena do: ${formatPrice(Number(priceMax))}`,
        clear: () => {
          storeSetPriceMax("");
          doLoadTours(1);
        },
      },
      dateStart && {
        key: "dateStart",
        label: `Od: ${fmtDate(dateStart)}`,
        clear: () => {
          storeSetDateStart("");
          doLoadTours(1);
        },
      },
      dateEnd && {
        key: "dateEnd",
        label: `Do: ${fmtDate(dateEnd)}`,
        clear: () => {
          storeSetDateEnd("");
          doLoadTours(1);
        },
      },
    ] as (FilterChip | false)[]
  ).filter(Boolean) as FilterChip[];

  return (
    <AdminLayout title="Vyhledávání zájezdů">
      <SkipToContent />
      <ProviderSelector
        providers={providers}
        selectedProviderId={selectedProviderId}
        onChange={handleProviderChange}
      />

      <RegionPicker
        regions={regions}
        regionsLoading={regionsLoading}
        selectedRegion={selectedRegion}
        selectedSubRegion={selectedSubRegion}
        isTwoLevel={isTwoLevel}
        departureCities={departureCities}
        destinationCountries={destinationCountries}
        onRegionChange={handleRegionChange}
        onSubRegionChange={handleSubRegionChange}
      />

      <ErrorBoundary key="filter-bar" onReset={() => window.location.reload()}>
        <TourFilterBar
          search={search}
          priceMin={priceMin}
          priceMax={priceMax}
          dateStart={dateStart}
          dateEnd={dateEnd}
          providerFilters={providerFilters}
          selectedProvider={selectedProvider}
          validationErrors={validationErrors}
          loading={loading}
          activeChips={activeChips}
          onSearchChange={handleSearchDebounced}
          onPriceMinChange={storeSetPriceMin}
          onPriceMaxChange={storeSetPriceMax}
          onDateStartChange={storeSetDateStart}
          onDateEndChange={storeSetDateEnd}
          onProviderFilterChange={handleProviderFilterChange}
          onSubmit={handleSearch}
          onReset={handleReset}
          onRefresh={handleRefresh}
        />
      </ErrorBoundary>

      <ImportPanel
        selected={selected}
        tours={tours}
        page={page}
        totalPages={totalPages}
        filteredCount={filteredCount}
        importing={importing}
        importResult={importResult}
        onImportSelected={handleImportSelected}
        onImportAll={handleImportAll}
        onExportCsv={exportToursCsv}
      />

      <ErrorBoundary key="results-table" onReset={() => window.location.reload()}>
        <TourDataTable
          tours={tours}
          loading={loading}
          error={error}
          selected={selected}
          visibleColumns={visibleColumns}
          sortBy={sortBy}
          sortDir={sortDir}
          page={page}
          totalPages={totalPages}
          limit={limit}
          filteredCount={filteredCount}
          cacheStatus={cacheStatus}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onSortToggle={handleSortToggle}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onTourClick={setDetailTour}
        />
      </ErrorBoundary>

      <TourDetailDrawer
        tour={detailTour}
        onClose={() => setDetailTour(null)}
        onImport={(externalId) => handleImport([externalId])}
        importing={importing}
      />

      <ConfirmDialog
        isOpen={confirmImportOpen}
        title="Importovat zájezdy?"
        message={
          importMode === "selected"
            ? `Opravdu chcete importovat ${selected.size} vybraných zájezdů?`
            : `Opravdu chcete importovat všech ${tours.length} zájezdů z aktuálního vyhledávání?`
        }
        confirmLabel="Importovat"
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setConfirmImportOpen(false);
          setImportMode(null);
        }}
      />
    </AdminLayout>
  );
}
