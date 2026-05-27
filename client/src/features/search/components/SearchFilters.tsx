import {
  Heart,
  RotateCcw,
} from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { PublicDestinationSummary } from "../../../types/providers";
import { PriceRangeSlider } from "../../../components/PriceRangeSlider";
import type { SearchFilterState } from "../hooks/useSearchFilters";
import { DestinationMultiSelect } from "./DestinationMultiSelect";
import { NightsFilter } from "./NightsFilter";
import { StarRatingPicker } from "./StarRatingPicker";
import { BoardMultiSelect } from "./BoardMultiSelect";
import { TransportFilter } from "./TransportFilter";

interface Props {
  t: (key: TranslationKey) => string;
  filters: SearchFilterState;
  destinations: PublicDestinationSummary[];
  destinationsStatus: "loading" | "error" | "ready";
  destinationsError: string | null;
  onRetryDestinations: () => void;
  naturalPriceRange: { min: number; max: number };
  priceRange: { min: number; max: number };
  priceMin: number;
  priceMax: number;
  hasResults: boolean;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  onReset: () => void;
  /** Whether to show the sidebar contact CTA (hide in mobile drawer) */
  showContactCta?: boolean;
}

export function SearchFilters({
  t,
  filters,
  destinations,
  destinationsStatus,
  destinationsError,
  onRetryDestinations,
  naturalPriceRange,
  priceRange,
  priceMin,
  priceMax,
  hasResults,
  favoritesCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  onReset,
  showContactCta = true,
}: Props) {
  return (
    <>
      {/* Destinations */}
      <div className="search-filter-block">
        <h2>{t("sFilterDestinations")}</h2>
        {destinationsStatus === "loading" && (
          <div className="search-region-list search-region-list--loading" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-line"
                style={{ height: 24, margin: "6px 0" }}
              />
            ))}
          </div>
        )}
        {destinationsStatus === "error" && (
          <div
            role="alert"
            className="search-error"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <span>{destinationsError}</span>
            <button
              type="button"
              onClick={onRetryDestinations}
              style={{
                alignSelf: "flex-start",
                textDecoration: "underline",
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {t("sFilterRetry")}
            </button>
          </div>
        )}
        {destinationsStatus === "ready" && destinations.length === 0 && (
          <p style={{ fontSize: ".875rem", color: "#64748b" }}>
            {t("sFilterNoDestinations")}
          </p>
        )}
        {destinationsStatus === "ready" && destinations.length > 0 && (
          <DestinationMultiSelect
            t={t}
            value={filters.activeDestinationSlug}
            onChange={(value) => filters.updateParams({ destinationSlug: value || null, q: null, page: 1 })}
            destinations={destinations}
          />
        )}
      </div>

      {/* Transport */}
      <div className="search-filter-block">
        <h2>{t("sFormTransport")}</h2>
        <TransportFilter
          t={t}
          value={filters.activeTransport}
          onChange={(value) => filters.updateParams({ transport: value || null, page: 1 })}
        />
        <label className="hotel-only-toggle">
          <input
            type="checkbox"
            checked={filters.activeHotelOnly}
            onChange={(e) =>
              filters.updateParams({ hotelOnly: e.target.checked ? "1" : null, page: 1 })
            }
          />
          <span>{t("sFilterHotelOnly")}</span>
        </label>
      </div>

      {/* Price range */}
      {hasResults && (
        <div className="search-filter-block">
          <h2>{t("sFilterPrice")}</h2>
          <PriceRangeSlider
            min={priceRange.min}
            max={priceRange.max}
            valueMin={priceMin}
            valueMax={priceMax}
            onChange={(min, max) => filters.updateParams({ priceMin: min, priceMax: max, page: 1 })}
          />
        </div>
      )}

      {/* Nights */}
      <div className="search-filter-block">
        <h2>{t("sFilterNights")}</h2>
        <NightsFilter
          t={t}
          value={filters.activeNights}
          onChange={(value) => filters.updateParams({ nights: value, page: 1 })}
        />
      </div>

      {/* Stars */}
      <div className="search-filter-block">
        <h2>{t("sFilterStars")}</h2>
        <StarRatingPicker
          t={t}
          value={filters.activeStars}
          onChange={(value) => filters.updateParams({ stars: value, page: 1 })}
        />
      </div>

      {/* Board */}
      <div className="search-filter-block">
        <h2>{t("sFilterBoard")}</h2>
        <BoardMultiSelect
          t={t}
          value={filters.activeBoard}
          onChange={(value) => filters.updateParams({ board: value || null, page: 1 })}
        />
      </div>

      {/* Favorites */}
      {favoritesCount > 0 && (
        <div className="search-filter-block">
          <h2>{t("sFilterSaved")}</h2>
          <button
            type="button"
            className={`filter-btn-list__btn${showFavoritesOnly ? " is-active" : ""}`}
            onClick={onToggleFavoritesOnly}
          >
            <Heart size={14} aria-hidden="true" />
            {favoritesCount} {t("sFilterSavedCount")}
          </button>
        </div>
      )}

      {/* Reset */}
      <button className="search-reset" type="button" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        {t("sFilterReset")}
      </button>

      {/* Sidebar contact */}
      {showContactCta && (
        <div className="sidebar-contact-cta">
          <p>{t("sSidebarContactPrompt")}</p>
          <a href="tel:+420721163860" className="sidebar-contact-phone">
            📞 +420 721 163 860
          </a>
          <a href="mailto:info@skytravel.cz" className="sidebar-contact-email">
            ✉ info@skytravel.cz
          </a>
          <p className="sidebar-contact-note">{t("sSidebarContactNote")}</p>
        </div>
      )}
    </>
  );
}
