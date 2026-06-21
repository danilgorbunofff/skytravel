import { useState, useEffect } from "react";
import { CalendarDays, Plane, Bus, Car, Train, Ship, Search, Users, Plus, Minus } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { PublicDestinationSummary } from "../../../types/providers";
import { getTransportOptions, DEFAULT_ADULTS, DEFAULT_CHILDREN } from "../constants";
import { SearchAutocomplete } from "./SearchAutocomplete";

interface Props {
  t: (key: TranslationKey) => string;
  query: string;
  dateStart: string;
  dateEnd: string;
  transport: string;
  adults: number;
  children: number;
  dateError: string | null;
  validationError: string | null;
  destinations: PublicDestinationSummary[];
  onQueryChange: (value: string) => void;
  onDateStartChange: (value: string) => void;
  onDateEndChange: (value: string) => void;
  onTransportChange: (value: string) => void;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onDestinationSelect: (slug: string | undefined, label: string) => void;
}

const TRANSPORT_ICON_MAP: Record<string, typeof Plane> = {
  plane: Plane,
  bus: Bus,
  car: Car,
  train: Train,
  boat: Ship,
};

export function SearchHero({
  t,
  query,
  dateStart,
  dateEnd,
  transport,
  adults,
  children,
  dateError,
  validationError,
  destinations,
  onQueryChange,
  onDateStartChange,
  onDateEndChange,
  onTransportChange,
  onAdultsChange,
  onChildrenChange,
  onSubmit,
  onDestinationSelect,
}: Props) {
  const TRANSPORT_OPTIONS = getTransportOptions(t);
  const TransportIcon = TRANSPORT_ICON_MAP[transport] ?? Plane;

  // Raw string state for editable number inputs (allows empty while typing)
  const [adultsRaw, setAdultsRaw] = useState(String(adults));
  const [childrenRaw, setChildrenRaw] = useState(String(children));
  useEffect(() => { setAdultsRaw(String(adults)); }, [adults]);
  useEffect(() => { setChildrenRaw(String(children)); }, [children]);

  const clampAdults = (v: number) => Math.min(9, Math.max(1, Math.round(v)));
  const clampChildren = (v: number) => Math.min(6, Math.max(0, Math.round(v)));

  const handleAdultsBlur = () => {
    const parsed = Number(adultsRaw);
    const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 9;
    const clamped = valid ? Math.round(parsed) : DEFAULT_ADULTS;
    setAdultsRaw(String(clamped));
    onAdultsChange(clamped);
  };

  const handleChildrenBlur = () => {
    const parsed = Number(childrenRaw);
    const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= 6;
    const clamped = valid ? Math.round(parsed) : DEFAULT_CHILDREN;
    setChildrenRaw(String(clamped));
    onChildrenChange(clamped);
  };

  const handleAdultsStep = (delta: number) => {
    const base = adultsRaw === "" ? DEFAULT_ADULTS : Math.round(Number(adultsRaw)) || DEFAULT_ADULTS;
    const next = clampAdults(base + delta);
    setAdultsRaw(String(next));
    onAdultsChange(next);
  };

  const handleChildrenStep = (delta: number) => {
    const base = childrenRaw === "" ? DEFAULT_CHILDREN : Math.round(Number(childrenRaw)) || DEFAULT_CHILDREN;
    const next = clampChildren(base + delta);
    setChildrenRaw(String(next));
    onChildrenChange(next);
  };

  // Derived values for stepper disabled state
  const currentAdults = adultsRaw === "" ? DEFAULT_ADULTS : Math.round(Number(adultsRaw)) || DEFAULT_ADULTS;
  const currentChildren = childrenRaw === "" ? DEFAULT_CHILDREN : Math.round(Number(childrenRaw)) || DEFAULT_CHILDREN;

  return (
    <section className="search-hero-section">
      <div className="container search-hero-grid">
        <div>
          <p className="search-eyebrow">SkyTravel search</p>
          <h1>{t("sHeroTitle")}</h1>
          <p>{t("sHeroSubtitle")}</p>
        </div>

        <form className="public-search-panel" onSubmit={onSubmit}>
          {/* Row 1: Destination, Od, Do */}
          <label className="search-field-query">
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
          <label className="search-field-start">
            <span>{t("sFormDeparture")}</span>
            <div className="public-search-input">
              <CalendarDays size={18} aria-hidden="true" />
              <input
                type="date"
                value={dateStart}
                onChange={(e) => onDateStartChange(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                aria-invalid={!!dateError}
              />
            </div>
            {dateError && (
              <span className="search-field-error" role="alert">{dateError}</span>
            )}
          </label>
          <label className="search-field-end">
            <span>{t("sFormReturn")}</span>
            <div className="public-search-input">
              <CalendarDays size={18} aria-hidden="true" />
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => onDateEndChange(e.target.value)}
                min={dateStart || new Date().toISOString().slice(0, 10)}
                aria-invalid={!!dateError}
              />
            </div>
            {dateError && (
              <span className="search-field-error" role="alert">{dateError}</span>
            )}
          </label>

          {/* Row 2: Adults, Children */}
          <div className="search-field-people">
            <label>
              <span>{t("sFormAdults")}</span>
              <div className="public-search-input search-input-with-stepper">
                <Users size={18} aria-hidden="true" />
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={adultsRaw}
                  onChange={(e) => setAdultsRaw(e.target.value)}
                  onBlur={handleAdultsBlur}
                />
                <div className="people-stepper">
                  <button type="button" onClick={() => handleAdultsStep(1)} disabled={currentAdults >= 9} aria-label="Increase adults">
                    <Plus size={12} />
                  </button>
                  <button type="button" onClick={() => handleAdultsStep(-1)} disabled={currentAdults <= 1} aria-label="Decrease adults">
                    <Minus size={12} />
                  </button>
                </div>
              </div>
            </label>
            <label>
              <span>{t("sFormChildren")}</span>
              <div className="public-search-input search-input-with-stepper">
                <Users size={18} aria-hidden="true" />
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={childrenRaw}
                  onChange={(e) => setChildrenRaw(e.target.value)}
                  onBlur={handleChildrenBlur}
                />
                <div className="people-stepper">
                  <button type="button" onClick={() => handleChildrenStep(1)} disabled={currentChildren >= 6} aria-label="Increase children">
                    <Plus size={12} />
                  </button>
                  <button type="button" onClick={() => handleChildrenStep(-1)} disabled={currentChildren <= 0} aria-label="Decrease children">
                    <Minus size={12} />
                  </button>
                </div>
              </div>
            </label>
          </div>

          {/* Row 3: Transport, Submit */}
          <label className="search-field-transport">
            <span>{t("sFormTransport")}</span>
            <div className="public-search-input">
              <TransportIcon size={18} aria-hidden="true" />
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
