import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  fetchOrextravelTours,
  fetchOrextravelRoutes,
  importOrextravel,
  refreshOrextravelCache,
  streamOrextravelTours,
  type OrextravelFilters,
  type OrextravelTour,
  type OrextravelRoute,
} from "../api";
import { formatPrice } from "../utils";
import "../admin.css";

// ── Labels ────────────────────────────────────────────────────────────────
const transportLabel: Record<string, string> = {
  plane: "✈ Letecky",
  bus: "🚌 Autobusem",
  train: "🚆 Vlakem",
  car: "🚗 Vlastní",
  boat: "🚢 Lodí",
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("cs-CZ");
};

const renderStars = (s: string | undefined): string => {
  if (!s) return "";
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? s : "★".repeat(Math.min(n, 5));
};

const PLACEHOLDER_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#e67e22", "#9b59b6",
  "#1abc9c", "#f39c12", "#d35400", "#2980b9", "#c0392b",
];
const placeholderColor = (dest: string) =>
  PLACEHOLDER_COLORS[dest.charCodeAt(0) % PLACEHOLDER_COLORS.length];

export default function AdminOrextravelPage() {
  // ── Data ──
  const [tours, setTours] = useState<OrextravelTour[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Routes (departure → destination) ──
  const [routes, setRoutes] = useState<OrextravelRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedTownFrom, setSelectedTownFrom] = useState<number | undefined>(undefined);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ── Sort ──
  const [sortBy, setSortBy] = useState<"price" | "date">("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Selection & import ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // ── Detail drawer ──
  const [detailTour, setDetailTour] = useState<OrextravelTour | null>(null);

  // ── SSE streaming ──
  const [streaming, setStreaming] = useState(false);
  const [streamLoaded, setStreamLoaded] = useState(0);
  const closeStreamRef = useRef<(() => void) | null>(null);

  // ── Stats from server ──
  const [uniqueDestinations, setUniqueDestinations] = useState(0);
  const [uniqueHotels, setUniqueHotels] = useState(0);

  // ── Derived: unique departure cities and destination countries ──
  const departureCities = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of routes) map.set(r.town, r.townName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [routes]);

  const destinationCountries = useMemo(() => {
    const filtered = selectedTownFrom
      ? routes.filter((r) => r.town === selectedTownFrom)
      : routes;
    const map = new Map<number, string>();
    for (const r of filtered) map.set(r.state, r.stateName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [routes, selectedTownFrom]);

  // ── Build filter object ──
  function buildFilters(pageOverride?: number): OrextravelFilters {
    const f: OrextravelFilters = {};
    if (search) f.q = search;
    if (priceMin) f.priceMin = Number(priceMin);
    if (priceMax) f.priceMax = Number(priceMax);
    if (dateStart) f.dateStart = dateStart;
    if (dateEnd) f.dateEnd = dateEnd;
    if (selectedTownFrom !== undefined) f.townFrom = selectedTownFrom;
    if (selectedStateId !== undefined) f.stateId = selectedStateId;
    f.page = pageOverride ?? page;
    f.limit = limit;
    f.sortBy = sortBy;
    f.sortDir = sortDir;
    return f;
  }

  // ── Core fetch ──
  const loadTours = useCallback(async (filters: OrextravelFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrextravelTours(filters);
      setTours(result.items);
      setTotalCount(result.total);
      setFilteredCount(result.filtered);
      setUniqueDestinations(result.uniqueDestinations ?? 0);
      setUniqueHotels(result.uniqueHotels ?? 0);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se načíst nabídky");
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE streaming load for initial/cold fetches
  const loadToursStream = useCallback((townFrom?: number, stateId?: number) => {
    if (closeStreamRef.current) closeStreamRef.current();
    setStreaming(true);
    setStreamLoaded(0);
    setLoading(true);
    setError(null);
    setTours([]);
    setTotalCount(0);
    setFilteredCount(0);

    const close = streamOrextravelTours(
      { townFrom, stateId },
      (items, loaded) => {
        setStreamLoaded(loaded);
        // Accumulate tours during stream for live preview
        setTours((prev) => [...prev, ...items]);
      },
      (total) => {
        // Stream done — switch to paginated mode
        setStreaming(false);
        setStreamLoaded(0);
        closeStreamRef.current = null;
        setTotalCount(total);
        // Fetch first page with proper filtering/sorting/pagination
        loadTours({
          townFrom,
          stateId,
          page: 1,
          limit,
          sortBy,
          sortDir,
        });
      },
      (err) => {
        setStreaming(false);
        setStreamLoaded(0);
        setLoading(false);
        closeStreamRef.current = null;
        setError(err.message);
      },
    );
    closeStreamRef.current = close;
  }, [loadTours, limit, sortBy, sortDir]);

  // Load routes on mount
  useEffect(() => {
    setRoutesLoading(true);
    fetchOrextravelRoutes()
      .then((r) => setRoutes(r.items))
      .catch(() => {})
      .finally(() => setRoutesLoading(false));
  }, []);

  // Initial load via streaming
  useEffect(() => {
    loadToursStream(undefined, undefined);
    return () => { if (closeStreamRef.current) closeStreamRef.current(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    setPage(1);
    loadTours(buildFilters(1));
  }

  function handleReset() {
    setSearch("");
    setPriceMin("");
    setPriceMax("");
    setDateStart("");
    setDateEnd("");
    setSelected(new Set());
    setImportResult(null);
    setValidationErrors({});
    setPage(1);
    loadTours({
      townFrom: selectedTownFrom,
      stateId: selectedStateId,
      page: 1,
      limit,
      sortBy,
      sortDir,
    });
  }

  async function handleRefresh() {
    await refreshOrextravelCache();
    setPage(1);
    loadToursStream(selectedTownFrom, selectedStateId);
  }

  function handleTownFromChange(townId: number | undefined) {
    setSelectedTownFrom(townId);
    setSelectedStateId(undefined);
    setPage(1);
    setSelected(new Set());
    loadToursStream(townId, undefined);
  }

  function handleStateChange(stateId: number | undefined) {
    setSelectedStateId(stateId);
    setPage(1);
    setSelected(new Set());
    loadToursStream(selectedTownFrom, stateId);
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    setSelected(new Set());
    loadTours(buildFilters(newPage));
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
    const f = buildFilters(1);
    f.limit = newLimit;
    loadTours(f);
  }

  function toggleSort(field: "price" | "date") {
    const newDir = sortBy === field ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortBy(field);
    setSortDir(newDir);
    setPage(1);
    const f = buildFilters(1);
    f.sortBy = field;
    f.sortDir = newDir;
    loadTours(f);
  }

  function removeFilter(field: keyof OrextravelFilters, clearFn: () => void) {
    clearFn();
    const f: OrextravelFilters = { page: 1, limit, sortBy, sortDir };
    if (selectedTownFrom !== undefined) f.townFrom = selectedTownFrom;
    if (selectedStateId !== undefined) f.stateId = selectedStateId;
    if (field !== "q" && search) f.q = search;
    if (field !== "priceMin" && priceMin) f.priceMin = Number(priceMin);
    if (field !== "priceMax" && priceMax) f.priceMax = Number(priceMax);
    if (field !== "dateStart" && dateStart) f.dateStart = dateStart;
    if (field !== "dateEnd" && dateEnd) f.dateEnd = dateEnd;
    setPage(1);
    loadTours(f);
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
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importOrextravel({
        ids,
        townFrom: selectedTownFrom,
        stateId: selectedStateId,
      });
      if (result.ok) {
        setImportResult(
          `Import dokončen: ${result.created ?? 0} nových, ${result.updated ?? 0} aktualizovaných (celkem ${result.total}).`,
        );
      } else {
        setImportResult(result.message ?? "Import se nezdařil.");
      }
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : "Chyba při importu.");
    } finally {
      setImporting(false);
    }
  }

  // ── Stats ──
  const stats = useMemo(() => {
    if (tours.length === 0) return null;
    const prices = tours.map((t) => t.price);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    };
  }, [tours]);

  // ── Active filter chips ──
  type FilterChip = { key: string; label: string; clear: () => void };
  const activeChips: FilterChip[] = (
    [
      search && {
        key: "q",
        label: `Hledám: „${search}"`,
        clear: () => removeFilter("q", () => setSearch("")),
      },
      priceMin && {
        key: "priceMin",
        label: `Cena od: ${formatPrice(Number(priceMin))}`,
        clear: () => removeFilter("priceMin", () => setPriceMin("")),
      },
      priceMax && {
        key: "priceMax",
        label: `Cena do: ${formatPrice(Number(priceMax))}`,
        clear: () => removeFilter("priceMax", () => setPriceMax("")),
      },
      dateStart && {
        key: "dateStart",
        label: `Od: ${fmtDate(dateStart)}`,
        clear: () => removeFilter("dateStart", () => setDateStart("")),
      },
      dateEnd && {
        key: "dateEnd",
        label: `Do: ${fmtDate(dateEnd)}`,
        clear: () => removeFilter("dateEnd", () => setDateEnd("")),
      },
    ] as (FilterChip | false)[]
  ).filter(Boolean) as FilterChip[];

  const sortIcon = (field: "price" | "date") =>
    sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Close drawer on Esc ──
  useEffect(() => {
    if (!detailTour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailTour(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailTour]);

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

  return (
    <AdminLayout title="Orextravel – Nabídky">
      {/* ── Route selector ─────────────────────────── */}
      <section className="admin-card">
        <div className="alex-country-bar">
          <label><strong>Odletové město:</strong></label>
          {routesLoading ? (
            <span className="alex-country-loading">Načítám trasy…</span>
          ) : (
            <div className="alex-country-tabs">
              <button
                type="button"
                className={`alex-country-tab${selectedTownFrom === undefined ? " is-active" : ""}`}
                onClick={() => handleTownFromChange(undefined)}
              >
                Vše
              </button>
              {departureCities.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`alex-country-tab${selectedTownFrom === c.id ? " is-active" : ""}`}
                  onClick={() => handleTownFromChange(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="alex-country-bar" style={{ marginTop: "0.75rem" }}>
          <label><strong>Destinace:</strong></label>
          <div className="alex-country-tabs">
            <button
              type="button"
              className={`alex-country-tab${selectedStateId === undefined ? " is-active" : ""}`}
              onClick={() => handleStateChange(undefined)}
            >
              Vše
            </button>
            {destinationCountries.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`alex-country-tab${selectedStateId === c.id ? " is-active" : ""}`}
                onClick={() => handleStateChange(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Summary tiles ───────────────────────────────── */}
      <section className="admin-card">
        <div className="alex-stats">
          <div className="alex-stat-tile">
            <span>Celkem ve feedu</span>
            <strong>{totalCount.toLocaleString("cs")}</strong>
          </div>
          <div className="alex-stat-tile">
            <span>Po filtraci</span>
            <strong>{filteredCount.toLocaleString("cs")}</strong>
          </div>
          <div className="alex-stat-tile">
            <span>Unikátních destinací</span>
            <strong>{uniqueDestinations.toLocaleString("cs")}</strong>
          </div>
          <div className="alex-stat-tile">
            <span>Unikátních hotelů</span>
            <strong>{uniqueHotels.toLocaleString("cs")}</strong>
          </div>
          {stats && (
            <>
              <div className="alex-stat-tile">
                <span>Cena od</span>
                <strong>{formatPrice(stats.minPrice)}</strong>
              </div>
              <div className="alex-stat-tile">
                <span>Cena do</span>
                <strong>{formatPrice(stats.maxPrice)}</strong>
              </div>
              <div className="alex-stat-tile">
                <span>Průměr</span>
                <strong>{formatPrice(stats.avgPrice)}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Filters ────────────────────────────────────── */}
      <section className="admin-card">
        <h2>Filtrovat nabídky</h2>
        <form className="alex-filters" onSubmit={handleSearch}>
          <div className="alex-filter-row">
            <div className="alex-filter-field">
              <label htmlFor="orexQ">Hledat</label>
              <input
                id="orexQ"
                type="text"
                placeholder="Destinace, hotel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.price ? " has-error" : ""}`}>
              <label htmlFor="orexPriceMin">Cena od</label>
              <input
                id="orexPriceMin"
                type="number"
                min={0}
                step={100}
                placeholder="Kč"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.price ? " has-error" : ""}`}>
              <label htmlFor="orexPriceMax">Cena do</label>
              <input
                id="orexPriceMax"
                type="number"
                min={0}
                step={100}
                placeholder="Kč"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.date ? " has-error" : ""}`}>
              <label htmlFor="orexDateStart">Od</label>
              <input
                id="orexDateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.date ? " has-error" : ""}`}>
              <label htmlFor="orexDateEnd">Do</label>
              <input
                id="orexDateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>

          {(validationErrors.price || validationErrors.date) && (
            <div className="alex-filter-errors">
              {validationErrors.price && (
                <span className="alex-filter-error">⚠ {validationErrors.price}</span>
              )}
              {validationErrors.date && (
                <span className="alex-filter-error">⚠ {validationErrors.date}</span>
              )}
            </div>
          )}

          <div className="alex-filter-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Načítám…" : "Hledat"}
            </button>
            <button type="button" className="ghost" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="ghost" onClick={handleRefresh} disabled={loading}>
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

      {/* ── Import controls ────────────────────────────── */}
      <section className="admin-card">
        <div className="alex-import-bar">
          <div className="alex-import-info">
            <span>
              {selected.size > 0
                ? `Vybráno ${selected.size} z ${tours.length}`
                : `Stránka ${page} z ${totalPages} (${filteredCount.toLocaleString("cs")} výsledků)`}
            </span>
            {importResult && <p className="note">{importResult}</p>}
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
              onClick={() => handleImport()}
              disabled={importing}
            >
              {importing ? "Importuji…" : "Importovat vše"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Error ──────────────────────────────────────── */}
      {error && (
        <section className="admin-card">
          <p className="note" style={{ color: "#d32f2f" }}>
            {error}
          </p>
        </section>
      )}

      {/* ── Results table ──────────────────────────────── */}
      <section className="admin-card">
        <h2>Výsledky</h2>

        {(loading || streaming) && (
          <div className="table-skeleton">
            {streaming ? (
              <div className="orex-stream-progress">
                <div className="orex-stream-bar">
                  <div className="orex-stream-bar-fill" style={{ width: streamLoaded > 0 ? "100%" : "30%" }} />
                </div>
                <span>Načítám nabídky… {streamLoaded > 0 ? `${streamLoaded.toLocaleString("cs")} načteno` : ""}</span>
              </div>
            ) : (
              <>
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </>
            )}
          </div>
        )}

        {!loading && tours.length === 0 && (
          <div className="empty-state">
            <strong>Žádné nabídky</strong>
            <p>Zkuste změnit filtry nebo obnovte feed tlačítkem ↻.</p>
          </div>
        )}

        {!loading && tours.length > 0 && (
          <div className="alex-table-wrap">
            <div className="alex-table-header">
              <span className="alex-col-check">
                <input
                  type="checkbox"
                  checked={selected.size === tours.length && tours.length > 0}
                  onChange={toggleSelectAll}
                />
              </span>
              <span className="alex-col-img" />
              <span className="alex-col-dest">Destinace / Hotel</span>
              <button
                type="button"
                className="alex-col-price alex-sort-btn"
                onClick={() => toggleSort("price")}
              >
                Cena/os.{sortIcon("price")}
              </button>
              <button
                type="button"
                className="alex-col-dates alex-sort-btn"
                onClick={() => toggleSort("date")}
              >
                Termín{sortIcon("date")}
              </button>
              <span className="alex-col-transport">Nocí</span>
              <span className="alex-col-people">Osoby</span>
              <span className="alex-col-transport">Strava</span>
              <span className="alex-col-room">Pokoj</span>
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
                    <img src={tour.image} alt={tour.title} loading="lazy" />
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
                    {tour.stars && (
                      <span className="alex-stars">
                        {renderStars(tour.stars)}
                      </span>
                    )}
                    <span className="alex-transport-inline">
                      {transportLabel[tour.transport] ?? tour.transport}
                    </span>
                  </span>
                </span>
                <span className="alex-col-price">
                  <strong>{formatPrice(tour.price)}</strong>
                </span>
                <span className="alex-col-dates">
                  {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
                </span>
                <span className="alex-col-transport">
                  {tour.nights ?? "–"}
                </span>
                <span className="alex-col-people">
                  {tour.adults ?? 0}+{tour.children ?? 0}
                </span>
                <span className="alex-col-transport">
                  {tour.board || "–"}
                </span>
                <span className="alex-col-room" title={tour.roomType || ""}>
                  {tour.roomType || "–"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="alex-pagination">
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
                  <span key={`ellipsis-${i}`} className="alex-page-ellipsis">…</span>
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

      {/* ── Detail drawer ──────────────────────────────── */}
      {detailTour && (
        <>
          <div className="alex-drawer-backdrop" onClick={() => setDetailTour(null)} />
          <aside className="alex-drawer">
            <div className="alex-drawer-header">
              <div>
                <h2>{detailTour.destination}</h2>
                <p>{detailTour.title}</p>
              </div>
              <button type="button" className="alex-drawer-close" onClick={() => setDetailTour(null)}>
                ×
              </button>
            </div>

            {/* Metadata */}
            <div className="alex-drawer-meta">
              <div className="alex-drawer-meta-row">
                <span>Cena za osobu</span>
                <strong className="alex-drawer-price">{formatPrice(detailTour.price)}</strong>
              </div>
              <div className="alex-drawer-meta-row">
                <span>Termín</span>
                <strong>{fmtDate(detailTour.startDate)} – {fmtDate(detailTour.endDate)}</strong>
              </div>
              {detailTour.nights !== undefined && (
                <div className="alex-drawer-meta-row">
                  <span>Počet nocí</span>
                  <strong>{detailTour.nights}</strong>
                </div>
              )}
              <div className="alex-drawer-meta-row">
                <span>Doprava</span>
                <strong>{transportLabel[detailTour.transport] ?? detailTour.transport}</strong>
              </div>
              {detailTour.board && (
                <div className="alex-drawer-meta-row">
                  <span>Strava</span>
                  <strong>{detailTour.board}</strong>
                </div>
              )}
              {detailTour.roomType && (
                <div className="alex-drawer-meta-row">
                  <span>Typ pokoje</span>
                  <strong>{detailTour.roomType}</strong>
                </div>
              )}
              {detailTour.stars && (
                <div className="alex-drawer-meta-row">
                  <span>Kategorie</span>
                  <strong>{detailTour.stars}</strong>
                </div>
              )}
              {detailTour.adults !== undefined && (
                <div className="alex-drawer-meta-row">
                  <span>Dospělí / Děti</span>
                  <strong>{detailTour.adults} + {detailTour.children ?? 0}</strong>
                </div>
              )}
            </div>

            {/* Description */}
            {detailTour.description && (
              <div className="alex-drawer-desc">
                <h3>Popis</h3>
                <p>{detailTour.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="alex-drawer-actions">
              <button
                type="button"
                className="alex-drawer-btn alex-drawer-btn--import"
                disabled={importing}
                onClick={async () => {
                  await handleImport([detailTour.externalId]);
                }}
              >
                {importing ? "Importuji…" : "Importovat tento zájezd"}
              </button>
            </div>
          </aside>
        </>
      )}
    </AdminLayout>
  );
}
