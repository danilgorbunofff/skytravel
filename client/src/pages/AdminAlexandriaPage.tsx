import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  fetchAlexandriaTours,
  importAlexandria,
  refreshAlexandriaCache,
  type AlexandriaFilters,
  type AlexandriaTour,
} from "../api";
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

export default function AdminAlexandriaPage() {
  // ── Data ──
  const [tours, setTours] = useState<AlexandriaTour[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [transport, setTransport] = useState("");
  const [board, setBoard] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ── Sort (client-side) ──
  const [sortBy, setSortBy] = useState<"price" | "date">("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Selection & import ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // ── Sorted tours (client-side, no extra fetch) ──
  const sortedTours = useMemo(() => {
    const arr = [...tours];
    arr.sort((a, b) => {
      if (sortBy === "date") {
        const d = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        return sortDir === "asc" ? d : -d;
      }
      const d = a.price - b.price;
      return sortDir === "asc" ? d : -d;
    });
    return arr;
  }, [tours, sortBy, sortDir]);

  // ── Unique board options extracted from loaded data ──
  const boardOptions = useMemo(
    () => [...new Set(tours.map((t) => t.board).filter((b): b is string => Boolean(b)))].sort(),
    [tours],
  );

  // ── Core fetch – accepts explicit filter object ──
  const loadTours = useCallback(async (filters: AlexandriaFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAlexandriaTours(filters);
      setTours(result.items);
      setTotalCount(result.total);
      setFilteredCount(result.filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se načíst nabídky");
    } finally {
      setLoading(false);
    }
  }, []);

  // Build filter object from current state
  function buildFilters(): AlexandriaFilters {
    const f: AlexandriaFilters = {};
    if (search) f.q = search;
    if (transport) f.transport = transport;
    if (board) f.board = board;
    if (priceMin) f.priceMin = Number(priceMin);
    if (priceMax) f.priceMax = Number(priceMax);
    if (dateStart) f.dateStart = dateStart;
    if (dateEnd) f.dateEnd = dateEnd;
    return f;
  }

  // Initial load
  useEffect(() => {
    loadTours();
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
    loadTours(buildFilters());
  }

  function handleReset() {
    setSearch("");
    setTransport("");
    setBoard("");
    setPriceMin("");
    setPriceMax("");
    setDateStart("");
    setDateEnd("");
    setSelected(new Set());
    setImportResult(null);
    setValidationErrors({});
    loadTours();
  }

  async function handleRefresh() {
    await refreshAlexandriaCache();
    loadTours({ ...buildFilters(), refresh: true });
  }

  function toggleSort(field: "price" | "date") {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  // Remove a single active filter chip and immediately reload
  function removeFilter(field: keyof AlexandriaFilters, clearFn: () => void) {
    clearFn();
    const f: AlexandriaFilters = {};
    if (field !== "q" && search) f.q = search;
    if (field !== "transport" && transport) f.transport = transport;
    if (field !== "board" && board) f.board = board;
    if (field !== "priceMin" && priceMin) f.priceMin = Number(priceMin);
    if (field !== "priceMax" && priceMax) f.priceMax = Number(priceMax);
    if (field !== "dateStart" && dateStart) f.dateStart = dateStart;
    if (field !== "dateEnd" && dateEnd) f.dateEnd = dateEnd;
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
    if (selected.size === sortedTours.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedTours.map((t) => t.externalId)));
    }
  }

  async function handleImport(ids?: string[]) {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importAlexandria({ ids });
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
      destinations: new Set(tours.map((t) => t.destination)).size,
    };
  }, [tours]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("cs-CZ");
  };

  // ── Active filter chips ──
  type FilterChip = { key: string; label: string; clear: () => void };
  const activeChips: FilterChip[] = (
    [
      search && {
        key: "q",
        label: `Hledám: „${search}"`,
        clear: () => removeFilter("q", () => setSearch("")),
      },
      transport && {
        key: "transport",
        label: `Doprava: ${transportLabel[transport] ?? transport}`,
        clear: () => removeFilter("transport", () => setTransport("")),
      },
      board && {
        key: "board",
        label: `Strava: ${boardLabel[board] ?? board}`,
        clear: () => removeFilter("board", () => setBoard("")),
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

  return (
    <AdminLayout title="CK Alexandria – Nabídky">
      {/* ── Summary tiles ───────────────────────────────── */}
      <section className="admin-card">
        <div className="alex-stats">
          <div className="alex-stat-tile">
            <span>Celkem ve feedu</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="alex-stat-tile">
            <span>Po filtraci</span>
            <strong>{filteredCount}</strong>
          </div>
          {stats && (
            <>
              <div className="alex-stat-tile">
                <span>Destinací</span>
                <strong>{stats.destinations}</strong>
              </div>
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
              <label htmlFor="alexQ">Hledat</label>
              <input
                id="alexQ"
                type="text"
                placeholder="Destinace, hotel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="alex-filter-field">
              <label htmlFor="alexTransport">Doprava</label>
              <select
                id="alexTransport"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
              >
                <option value="">Vše</option>
                <option value="plane">Letecky</option>
                <option value="bus">Autobusem</option>
                <option value="train">Vlakem</option>
                <option value="car">Vlastní</option>
                <option value="boat">Lodí</option>
              </select>
            </div>
            <div className="alex-filter-field">
              <label htmlFor="alexBoard">Strava</label>
              <select
                id="alexBoard"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              >
                <option value="">Vše</option>
                {boardOptions.length > 0 ? (
                  boardOptions.map((b) => (
                    <option key={b} value={b}>
                      {boardLabel[b] ?? b}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="AI">All Inclusive</option>
                    <option value="UAI">Ultra AI</option>
                    <option value="FB">Plná penze</option>
                    <option value="HB">Polopenze</option>
                    <option value="BB">Snídaně</option>
                    <option value="RO">Bez stravy</option>
                    <option value="SC">Vlastní doprava</option>
                  </>
                )}
              </select>
            </div>
            <div className={`alex-filter-field${validationErrors.price ? " has-error" : ""}`}>
              <label htmlFor="alexPriceMin">Cena od</label>
              <input
                id="alexPriceMin"
                type="number"
                min={0}
                step={100}
                placeholder="Kč"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.price ? " has-error" : ""}`}>
              <label htmlFor="alexPriceMax">Cena do</label>
              <input
                id="alexPriceMax"
                type="number"
                min={0}
                step={100}
                placeholder="Kč"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.date ? " has-error" : ""}`}>
              <label htmlFor="alexDateStart">Od</label>
              <input
                id="alexDateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className={`alex-filter-field${validationErrors.date ? " has-error" : ""}`}>
              <label htmlFor="alexDateEnd">Do</label>
              <input
                id="alexDateEnd"
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
                ? `Vybráno ${selected.size} z ${sortedTours.length}`
                : `Zobrazeno ${sortedTours.length}${filteredCount !== totalCount ? ` z ${totalCount} celkem` : ""}`}
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

        {loading && (
          <div className="table-skeleton">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        )}

        {!loading && tours.length === 0 && (
          <div className="empty-state">
            <strong>Žádné nabídky</strong>
            <p>Zkuste změnit filtry nebo obnovte feed tlačítkem ↻.</p>
          </div>
        )}

        {!loading && sortedTours.length > 0 && (
          <div className="alex-table-wrap">
            <div className="alex-table-header">
              <span className="alex-col-check">
                <input
                  type="checkbox"
                  checked={selected.size === sortedTours.length && sortedTours.length > 0}
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
              <span className="alex-col-transport">Doprava</span>
              <span className="alex-col-link" />
            </div>

            {sortedTours.map((tour) => (
              <div
                key={tour.externalId || `${tour.destination}-${tour.startDate}`}
                className={`alex-table-row${selected.has(tour.externalId) ? " is-selected" : ""}`}
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
                    <img src={tour.image} alt={tour.destination} loading="lazy" />
                  ) : (
                    <span className="alex-no-img">?</span>
                  )}
                </span>
                <span className="alex-col-dest">
                  <strong>{tour.destination}</strong>
                  <small>{tour.title}</small>
                  <span className="alex-row-meta">
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
                  {tour.description && (
                    <small className="alex-desc">{tour.description.slice(0, 120)}…</small>
                  )}
                </span>
                <span className="alex-col-price">
                  <strong>{formatPrice(tour.price)}</strong>
                </span>
                <span className="alex-col-dates">
                  {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}
                </span>
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
      </section>
    </AdminLayout>
  );
}
