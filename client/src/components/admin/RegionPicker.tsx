import type { ProviderRegion } from "../../types/providers";

type Props = {
  regions: ProviderRegion[];
  regionsLoading: boolean;
  selectedRegion: ProviderRegion | null;
  selectedSubRegion: ProviderRegion | null;
  isTwoLevel: boolean;
  departureCities: Array<{ id: number; name: string }>;
  destinationCountries: Array<{ id: number; name: string }>;
  onRegionChange: (region: ProviderRegion | null) => void;
  onSubRegionChange: (region: ProviderRegion | null) => void;
};

export default function RegionPicker({
  regions,
  regionsLoading,
  selectedRegion,
  selectedSubRegion,
  isTwoLevel,
  departureCities,
  destinationCountries,
  onRegionChange,
  onSubRegionChange,
}: Props) {
  if (regionsLoading) {
    return (
      <section className="admin-card">
        <span className="alex-country-loading">Načítám regiony…</span>
      </section>
    );
  }

  if (regions.length === 0) return null;

  return (
    <section className="admin-card">
      {!isTwoLevel ? (
        /* Single-level: flat country tabs */
        <div className="alex-country-bar">
          <label>
            <strong>Země:</strong>
          </label>
          <div className="alex-country-tabs">
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`alex-country-tab${selectedRegion?.id === r.id ? " is-active" : ""}`}
                onClick={() => onRegionChange(r)}
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
            <label htmlFor="orexDeparture">
              <strong>Odletové město:</strong>
            </label>
            <select
              id="orexDeparture"
              value={selectedRegion?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const city =
                  id != null ? (departureCities.find((c) => c.id === id) ?? null) : null;
                onRegionChange(city ? { id: city.id, name: city.name } : null);
              }}
            >
              <option value="">Vše</option>
              {departureCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="orex-route-select-group">
            <label htmlFor="orexDestination">
              <strong>Destinace:</strong>
            </label>
            <select
              id="orexDestination"
              value={selectedSubRegion?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const dest =
                  id != null ? (destinationCountries.find((c) => c.id === id) ?? null) : null;
                onSubRegionChange(dest ? { id: dest.id, name: dest.name } : null);
              }}
            >
              <option value="">Vše</option>
              {destinationCountries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  );
}
