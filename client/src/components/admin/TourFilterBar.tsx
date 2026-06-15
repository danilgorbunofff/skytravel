import type { ProviderMeta } from "../../types/providers";
import ProviderFilterRenderer from "./ProviderFilterRenderer";

type FilterChip = {
  key: string;
  label: string;
  clear: () => void;
};

type Props = {
  search: string;
  priceMin: string;
  priceMax: string;
  dateStart: string;
  dateEnd: string;
  providerFilters: Record<string, unknown>;
  selectedProvider: ProviderMeta | null;
  validationErrors: Record<string, string>;
  loading: boolean;
  activeChips: FilterChip[];
  onSearchChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onDateStartChange: (value: string) => void;
  onDateEndChange: (value: string) => void;
  onProviderFilterChange: (key: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  onRefresh: () => void;
};

export default function TourFilterBar({
  search,
  priceMin,
  priceMax,
  dateStart,
  dateEnd,
  providerFilters,
  selectedProvider,
  validationErrors,
  loading,
  activeChips,
  onSearchChange,
  onPriceMinChange,
  onPriceMaxChange,
  onDateStartChange,
  onDateEndChange,
  onProviderFilterChange,
  onSubmit,
  onReset,
  onRefresh,
}: Props) {
  return (
    <section className="admin-card">
      <h2>Filtrovat nabídky</h2>
      <form className="alex-filters" onSubmit={onSubmit}>
        {/* ─ Full-width search ─ */}
        <div className="alex-filter-field">
          <label htmlFor="searchQ">Hledat</label>
          <input
            id="searchQ"
            type="text"
            placeholder="Destinace, hotel…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
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
                onChange={(e) => onPriceMinChange(e.target.value)}
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
                onChange={(e) => onPriceMaxChange(e.target.value)}
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
                onChange={(e) => onDateStartChange(e.target.value)}
              />
              <span className="alex-filter-range-sep">–</span>
              <input
                id="searchDateEnd"
                type="date"
                aria-label="Datum do"
                value={dateEnd}
                onChange={(e) => onDateEndChange(e.target.value)}
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
              onChange={onProviderFilterChange}
            />
          </>
        )}

        <div className="alex-filter-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Načítám…" : "Hledat"}
          </button>
          <button type="button" className="ghost" onClick={onReset}>
            Reset
          </button>
          <button
            type="button"
            className="ghost refresh"
            onClick={onRefresh}
            disabled={loading}
          >
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
  );
}
