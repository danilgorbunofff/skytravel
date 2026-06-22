
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

/** Props for {@link SearchFilters}. */
interface Props {
  /** Translation function. */
  t: (key: TranslationKey) => string;
  /** Reactive filter state and setters from `useSearchFilters`. */
  filters: SearchFilterState;
  /** Available destination options from the bootstrap API. */
  destinations: PublicDestinationSummary[];
  /** Loading/error/ready status of the destinations bootstrap. */
  destinationsStatus: "loading" | "error" | "ready";
  /** Error message when destinations failed to load. */
  destinationsError: string | null;
  /** Retry loading destinations. */
  onRetryDestinations: () => void;
  /** The natural (unfiltered) price range across all results. */
  naturalPriceRange: { min: number; max: number };
  /** The full configurable price range for the slider. */
  priceRange: { min: number; max: number };
  /** Current min price slider value. */
  priceMin: number;
  /** Current max price slider value. */
  priceMax: number;
  /** Whether search results have been fetched (controls price slider visibility). */
  hasResults: boolean;
  /** Number of saved favorites (controls favorites filter visibility). */
  favoritesCount: number;
  /** Whether the "favorites only" filter is active. */
  showFavoritesOnly: boolean;
  /** Toggle the favorites-only filter. */
  onToggleFavoritesOnly: () => void;
  /** Reset all filters to defaults. */
  onReset: () => void;
  /** Whether to show the sidebar contact CTA (hide in mobile drawer). */
  showContactCta?: boolean;
}

export function SearchFilters({
  t,
  filters,
  destinations,
  destinationsStatus,
  destinationsError,
  onRetryDestinations,
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
                className="skeleton-line h-6 my-1.5"
              />
            ))}
          </div>
        )}
        {destinationsStatus === "error" && (
          <div
            role="alert"
            className="search-error flex flex-col gap-2"
          >
            <span>{destinationsError}</span>
              <button
                type="button"
                onClick={onRetryDestinations}
                className="self-start underline bg-transparent border-none text-inherit cursor-pointer p-0"
            >
              {t("sFilterRetry")}
            </button>
          </div>
        )}
        {destinationsStatus === "ready" && destinations.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
      <div className="search-filter-reset-wrapper">
        <button className="search-reset search-reset--prominent" type="button" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          {t("sFilterReset")}
        </button>
      </div>

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
