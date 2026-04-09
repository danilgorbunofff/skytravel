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
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // ── Selection & import ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // ── Fetch with current filters ──
  const loadTours = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const filters: AlexandriaFilters = {};
        if (search) filters.q = search;
        if (transport) filters.transport = transport;
        if (priceMin) filters.priceMin = Number(priceMin);
        if (priceMax) filters.priceMax = Number(priceMax);
        if (dateStart) filters.dateStart = dateStart;
        if (dateEnd) filters.dateEnd = dateEnd;
        if (refresh) filters.refresh = true;

        const result = await fetchAlexandriaTours(filters);
        setTours(result.items);
        setTotalCount(result.total);
        setFilteredCount(result.filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nepodařilo se načíst nabídky");
      } finally {
        setLoading(false);
      }
    },
    [search, transport, priceMin, priceMax, dateStart, dateEnd],
  );

  // initial load
  useEffect(() => {
    loadTours();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadTours();
  }

  function handleReset() {
    setSearch("");
    setTransport("");
    setPriceMin("");
    setPriceMax("");
    setDateStart("");
    setDateEnd("");
    setSelected(new Set());
    setImportResult(null);
  }

  async function handleRefresh() {
    await refreshAlexandriaCache();
    loadTours(true);
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

  const transportLabel: Record<string, string> = {
    plane: "✈ Letecky",
    bus: "🚌 Autobusem",
    train: "🚆 Vlakem",
    car: "🚗 Vlastní",
    boat: "🚢 Lodí",
  };

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
            <div className="alex-filter-field">
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
            <div className="alex-filter-field">
              <label htmlFor="alexDateStart">Od</label>
              <input
                id="alexDateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="alex-filter-field">
              <label htmlFor="alexDateEnd">Do</label>
              <input
                id="alexDateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
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
      </section>

      {/* ── Import controls ────────────────────────────── */}
      <section className="admin-card">
        <div className="alex-import-bar">
          <div className="alex-import-info">
            <span>
              {selected.size > 0
                ? `Vybráno ${selected.size} z ${tours.length}`
                : `${tours.length} nabídek`}
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
          <p className="note" style={{ color: "#d32f2f" }}>{error}</p>
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
            <p>Zkuste změnit filtry nebo obnovte feed.</p>
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
              <span className="alex-col-img">Foto</span>
              <span className="alex-col-dest">Destinace / Hotel</span>
              <span className="alex-col-price">Cena</span>
              <span className="alex-col-dates">Termín</span>
              <span className="alex-col-transport">Doprava</span>
            </div>
            {tours.map((tour) => (
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
                  {tour.description && (
                    <small className="alex-desc">{tour.description.slice(0, 100)}…</small>
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
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
