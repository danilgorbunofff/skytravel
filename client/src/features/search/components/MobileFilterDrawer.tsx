import type { TranslationKey } from "../../../hooks/useLanguage";
import type { SearchFilterState } from "../hooks/useSearchFilters";
import type { PublicDestinationSummary } from "../../../types/providers";
import { SearchFilters } from "./SearchFilters";

interface Props {
  t: (key: TranslationKey) => string;
  open: boolean;
  onClose: () => void;
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
  filteredCount: number | null;
}

export function MobileFilterDrawer({
  t,
  open,
  onClose,
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
  filteredCount,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className="mobile-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("sDrawerTitle")}
      >
        <div className="mobile-filter-drawer__header">
          <h2>{t("sDrawerTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("sDrawerClose")}>
            ✕
          </button>
        </div>
        <div className="mobile-filter-drawer__body">
          <SearchFilters
            t={t}
            filters={filters}
            destinations={destinations}
            destinationsStatus={destinationsStatus}
            destinationsError={destinationsError}
            onRetryDestinations={onRetryDestinations}
            naturalPriceRange={naturalPriceRange}
            priceRange={priceRange}
            priceMin={priceMin}
            priceMax={priceMax}
            hasResults={hasResults}
            favoritesCount={favoritesCount}
            showFavoritesOnly={showFavoritesOnly}
            onToggleFavoritesOnly={onToggleFavoritesOnly}
            onReset={() => {
              onReset();
              onClose();
            }}
            showContactCta={false}
          />
        </div>
        <div className="mobile-filter-drawer__footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("sDrawerApplyPrefix")}{" "}
            {filteredCount != null ? filteredCount.toLocaleString("cs-CZ") : ""}{" "}
            {t("sStickyOffers")}
          </button>
        </div>
      </div>
      <div className="mobile-filter-backdrop" onClick={onClose} />
    </>
  );
}
