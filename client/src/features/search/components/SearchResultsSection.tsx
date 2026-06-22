import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { ToursResult, UnifiedTour } from "../../../types/providers";
import type { SortField, ViewMode, PresetOption } from "../types";
import { PublicTourCard } from "./PublicTourCard";
import { TourCardSkeleton } from "./TourCardSkeleton";
import { SearchResultsToolbar } from "./SearchResultsToolbar";
import { ActiveFilterChips, type ChipData } from "./ActiveFilterChips";

/** Build pagination items array with ellipsis for smart pagination display.
 *  Returns (number | "...")[] e.g. [1, 2, "...", 9, 10] or [1, "...", 5, 6, 7, "...", 14] */
function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  // Always include first page
  pages.push(1);

  if (currentPage > 3) {
    pages.push("...");
  }

  // Pages around current
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  // Always include last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

interface Props {
  /** Translation function. */
  t: (key: TranslationKey) => string;
  /** The paginated results object from the API, or null. */
  result: ToursResult | null;
  /** Whether results are currently being fetched. */
  loading: boolean;
  /** Human-readable error string, or null. */
  error: string | null;
  /** Current view mode. */
  viewMode: ViewMode;
  /** Switch between grid and list view. */
  onSetView: (mode: ViewMode) => void;
  /** Current page number (1-indexed). */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Navigate to a specific page. */
  onPageChange: (page: number) => void;
  /** Active sort field. */
  sortBy: SortField;
  /** Sort direction. */
  sortDir: "asc" | "desc";
  /** Toggle sort for a given field. */
  onToggleSort: (field: SortField) => void;
  /** Primary results text (e.g., "Showing 1–12 of 48 tours"). */
  totalText: string;
  /** Secondary toolbar description. */
  toolbarDescription: string;
  /** Number of tours currently displayed. */
  displayedCount: number;
  /** Total un-filtered count from the API. */
  totalCount: number | null;
  /** Filtered count from the API. */
  filteredCount: number | null;
  /** Tours to render (accounting for favorites-only and mobile accumulation). */
  toursToRender: UnifiedTour[];
  /** Active filter chips shown above the results. */
  chips: ChipData[];
  /** Reset all filters handler. */
  onResetFilters: () => void;
  /** Share confirmation state. */
  shareConfirmation: "copied" | "failed" | null;
  /** Share handler. */
  onShare: () => void;
  /** Map of provider IDs to human-readable labels. */
  providerLabels: Record<string, string>;
  /** Check whether a tour ID is in favorites. */
  isFavorite: (id: string) => boolean;
  /** Toggle favorite for a tour. */
  onToggleFavorite: (tour: UnifiedTour) => void;
  /** Open tour detail modal. */
  onOpenDetail: (tour: UnifiedTour) => void;
  /** Check whether a tour ID is in the compare list. */
  isCompared: (id: string) => boolean;
  /** Toggle compare inclusion for a tour. */
  onToggleCompare: (tour: UnifiedTour) => void;
  /** Whether the compare list is full (max reached). */
  compareFull: boolean;
  /** Preset quick-filter buttons (shown only without user filters). */
  presets: PresetOption[];
  /** Apply preset params. */
  onPresetClick: (params: Record<string, string>) => void;
  /** Whether the viewport is mobile-sized. */
  isMobile: boolean;
  /** Whether favorites-only mode is active (affects mobile load-more). */
  showFavoritesOnly: boolean;
  /** Called to load the next page on mobile. */
  onLoadMore: () => void;
  /** Whether we have user filters active (controls preset visibility). */
  hasUserFilters: boolean;
}

/**
 * Renders the entire results area of the search page: toolbar, filter chips,
 * preset pills, the tour grid/list, loading/error/empty states, and pagination.
 *
 * This component is intentionally "dumb" — all state and side-effects live in
 * the parent `SearchPage`.
 */
export function SearchResultsSection({
  t,
  result,
  loading,
  error,
  viewMode,
  onSetView,
  page,
  totalPages,
  onPageChange,
  sortBy,
  sortDir,
  onToggleSort,
  totalText,
  toolbarDescription,
  displayedCount,
  totalCount,
  filteredCount,
  toursToRender,
  chips,
  onResetFilters,
  shareConfirmation,
  onShare,
  providerLabels,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  isCompared,
  onToggleCompare,
  compareFull,
  presets,
  onPresetClick,
  isMobile,
  showFavoritesOnly,
  onLoadMore,
  hasUserFilters,
}: Props) {
  return (
    <section className="search-results-main">
      <SearchResultsToolbar
        t={t}
        totalText={totalText}
        toolbarDescription={toolbarDescription}
        displayedCount={displayedCount}
        totalCount={totalCount}
        filteredCount={filteredCount}
        sortBy={sortBy}
        sortDir={sortDir}
        viewMode={viewMode}
        shareConfirmation={shareConfirmation}
        onToggleSort={onToggleSort}
        onSetView={onSetView}
        onShare={onShare}
      />

      {error && <div className="search-error" role="alert">{error}</div>}

      {loading && !result && (
        <TourCardSkeleton count={6} viewMode={viewMode} />
      )}

      {!loading && !error && result?.items.length === 0 && (
        <div className="search-empty search-empty--results">
          <div className="search-empty__icon" aria-hidden="true">🔍</div>
          <h3>{t("sNoResultsTitle")}</h3>
          <p>{t("sNoResultsBody")}</p>
          <ul className="search-empty__tips">
            <li>
              <button type="button" onClick={onResetFilters}>
                {t("sNoResultsTipReset")}
              </button>
            </li>
            <li>{t("sNoResultsTipDates")}</li>
            <li>{t("sNoResultsTipRegion")}</li>
            <li>
              {t("sNoResultsTipCallPre")}{" "}
              <a href="tel:+420721163860">{t("sNoResultsTipCallLink")}</a>{" "}
              {t("sNoResultsTipCallPost")}
            </li>
          </ul>
        </div>
      )}

      <ActiveFilterChips chips={chips} onResetAll={onResetFilters} />

      {!hasUserFilters && (
        <div className="preset-pills">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="preset-pill"
              onClick={() => onPresetClick(preset.params)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={viewMode === "grid" ? "tour-grid" : "tour-list"}
        aria-busy={loading}
        aria-live="polite"
        role="region"
        aria-label="Seznam zájezdů"
        style={
          loading && result
            ? { opacity: 0.6, pointerEvents: "none", position: "relative" }
            : undefined
        }
      >
        {toursToRender.map((tour, index) => {
          const tourId = `${tour.source}-${tour.externalId}`;
          return (
            <PublicTourCard
              t={t}
              key={tourId}
              tour={tour}
              viewMode={viewMode}
              isFavorite={isFavorite(tourId)}
              onToggleFavorite={() => onToggleFavorite(tour)}
              onOpenDetail={() => onOpenDetail(tour)}
              providerLabel={providerLabels[tour.source]}
              animationIndex={index}
              isCompared={isCompared(tourId)}
              onToggleCompare={() => onToggleCompare(tour)}
              compareFull={compareFull}
            />
          );
        })}
      </div>

      {loading && result && (
        <p
          className="search-updating-indicator"
          aria-live="polite"
        >
          {t("sStateUpdating")}
        </p>
      )}

      {isMobile && !showFavoritesOnly && result && page < totalPages && (
        <div className="mobile-load-more">
          <button
            type="button"
            className="btn-secondary"
            onClick={onLoadMore}
            disabled={loading}
            aria-label={t("sLoadMore")}
          >
            {loading ? t("sLoadingMore") : t("sLoadMore")}
          </button>
        </div>
      )}

      {!isMobile && !showFavoritesOnly && result && totalPages > 1 && (
        <nav className="search-pagination" aria-label="Stránkování">
          <button
            type="button"
            className="search-pagination__arrow"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            aria-label={`${t("sPagePrev")} — ${t("sPageLabel")} ${page - 1}`}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          <div className="search-pagination__pages">
            {buildPaginationItems(page, totalPages).map((item, i) =>
              item === "..." ? (
                <span key={`ellipsis-${i}`} className="search-pagination__ellipsis">
                  &hellip;
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`search-pagination__page${item === page ? " is-active" : ""}`}
                  onClick={() => onPageChange(item as number)}
                  disabled={loading}
                  aria-label={`${t("sPageLabel")} ${item}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            className="search-pagination__arrow"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            aria-label={`${t("sPageNext")} — ${t("sPageLabel")} ${page + 1}`}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  );
}
