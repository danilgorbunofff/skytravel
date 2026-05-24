import { CalendarDays, MapPin, Plane, Search } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { PublicDestinationSummary } from "../../../types/providers";
import { getTransportOptions } from "../constants";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { DateRangePicker } from "./DateRangePicker";

interface Props {
  t: (key: TranslationKey) => string;
  query: string;
  dateStart: string;
  dateEnd: string;
  transport: string;
  adults: number;
  children: number;
  heroExpanded: boolean;
  dateError: string | null;
  validationError: string | null;
  destinations: PublicDestinationSummary[];
  onQueryChange: (value: string) => void;
  onDateStartChange: (value: string) => void;
  onDateEndChange: (value: string) => void;
  onTransportChange: (value: string) => void;
  onAdultsChange: (delta: number) => void;
  onChildrenChange: (delta: number) => void;
  onToggleExpanded: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onDestinationSelect: (slug: string | undefined, label: string) => void;
}

export function SearchHero({
  t,
  query,
  dateStart,
  dateEnd,
  transport,
  adults,
  children,
  heroExpanded,
  dateError,
  validationError,
  destinations,
  onQueryChange,
  onDateStartChange,
  onDateEndChange,
  onTransportChange,
  onAdultsChange,
  onChildrenChange,
  onToggleExpanded,
  onSubmit,
  onDestinationSelect,
}: Props) {
  const TRANSPORT_OPTIONS = getTransportOptions(t);

  return (
    <section className="search-hero-section">
      <div className="container search-hero-grid">
        <div>
          <p className="search-eyebrow">SkyTravel search</p>
          <h1>{t("sHeroTitle")}</h1>
          <p>{t("sHeroSubtitle")}</p>
        </div>

        <form className="public-search-panel" onSubmit={onSubmit}>
          <label>
            <span>{t("sFormWhere")}</span>
            <SearchAutocomplete
              t={t}
              value={query}
              onChange={onQueryChange}
              onSelect={(suggestion) => {
                onDestinationSelect(suggestion.slug, suggestion.label);
              }}
              destinations={destinations}
              placeholder={t("sFormPlaceholder")}
            />
          </label>
          <div className={`search-panel-extra${heroExpanded ? " is-open" : ""}`}>
            <label>
              <span>{t("sFormDeparture")} – {t("sFormReturn")}</span>
              <DateRangePicker
                t={t}
                startDate={dateStart}
                endDate={dateEnd}
                onStartChange={onDateStartChange}
                onEndChange={onDateEndChange}
                onClear={() => {
                  onDateStartChange("");
                  onDateEndChange("");
                }}
              />
            </label>
            <label>
              <span>{t("sFormTransport")}</span>
              <div className="public-search-input">
                <Plane size={18} aria-hidden="true" />
                <select value={transport} onChange={(event) => onTransportChange(event.target.value)}>
                  <option value="">{t("sFormTransportAny")}</option>
                  {TRANSPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label>
              <span>{t("sFormPeople")}</span>
              <div className="public-search-input guests-picker">
                <div className="guests-stepper">
                  <div className="guests-stepper__row">
                    <span>{t("sFormAdults")}</span>
                    <div className="stepper">
                      <button type="button" onClick={() => onAdultsChange(-1)}>
                        −
                      </button>
                      <span>{adults}</span>
                      <button type="button" onClick={() => onAdultsChange(1)}>
                        +
                      </button>
                    </div>
                  </div>
                  <div className="guests-stepper__row">
                    <span>{t("sFormChildren")}</span>
                    <div className="stepper">
                      <button type="button" onClick={() => onChildrenChange(-1)}>
                        −
                      </button>
                      <span>{children}</span>
                      <button type="button" onClick={() => onChildrenChange(1)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>
          <button
            type="button"
            className="search-panel-toggle mobile-only"
            onClick={onToggleExpanded}
          >
            {heroExpanded ? t("sFormLess") : t("sFormMore")}
          </button>
          <button
            className="public-search-submit"
            type="submit"
            disabled={!!dateError}
            aria-disabled={!!dateError}
          >
            <Search size={18} aria-hidden="true" />
            {t("sFormSearch")}
          </button>
        </form>
        {(dateError || validationError) && (
          <p id="search-date-error" role="alert" className="search-validation">
            {dateError ?? validationError}
          </p>
        )}
      </div>
    </section>
  );
}
