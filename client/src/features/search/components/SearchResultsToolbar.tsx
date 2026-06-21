import { LayoutGrid, LayoutList, Share2 } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { ViewMode, SortField } from "../types";

/** Props for {@link SearchResultsToolbar}. */
interface Props {
  /** Translation function. */
  t: (key: TranslationKey) => string;
  /** Primary status text shown as an `<h2>` (e.g. "Showing 1–12 of 48 tours"). */
  totalText: string;
  /** Secondary description beneath the heading. */
  toolbarDescription: string;
  /** Number of tours displayed on the current page. */
  displayedCount: number;
  /** Total un-filtered count from the API (null whilst loading). */
  totalCount: number | null;
  /** Filtered result count from the API (null whilst loading). */
  filteredCount: number | null;
  /** Current sort field. */
  sortBy: SortField;
  /** Current sort direction. */
  sortDir: "asc" | "desc";
  /** Current view mode. */
  viewMode: ViewMode;
  /** Transient share-feedback state. */
  shareConfirmation: "copied" | "failed" | null;
  /** Toggle sort order for a given field (price or date). */
  onToggleSort: (field: SortField) => void;
  /** Switch between grid and list views. */
  onSetView: (mode: ViewMode) => void;
  /** Trigger the share action (native share or clipboard copy). */
  onShare: () => void;
}

export function SearchResultsToolbar({
  t,
  totalText,
  toolbarDescription,
  displayedCount,
  totalCount,
  filteredCount,
  sortBy,
  sortDir,
  viewMode,
  shareConfirmation,
  onToggleSort,
  onSetView,
  onShare,
}: Props) {
  return (
    <div className="search-results-toolbar">
      <div aria-live="polite" aria-atomic="true">
        <h2>{totalText}</h2>
        <p>{toolbarDescription}</p>
        {filteredCount !== null && totalCount !== null && filteredCount !== totalCount && (
          <p className="results-sub">
            {t("sStateShown")} {displayedCount.toLocaleString("cs-CZ")} {t("sStateOf")}{" "}
            {totalCount.toLocaleString("cs-CZ")} {t("sTotalSuffix")}
          </p>
        )}
      </div>
      <div className="search-sort-actions">
        <button
          type="button"
          className={sortBy === "price" ? "is-active" : ""}
          onClick={() => onToggleSort("price")}
          aria-label={`${t("sSortPrice")} — ${sortBy === "price" && sortDir === "asc" ? "sestupně" : "vzestupně"}`}
        >
          {t("sSortPrice")}{" "}
          {sortBy === "price" && (
            <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
        <button
          type="button"
          className={sortBy === "date" ? "is-active" : ""}
          onClick={() => onToggleSort("date")}
          aria-label={`${t("sSortDate")} — ${sortBy === "date" && sortDir === "asc" ? "sestupně" : "vzestupně"}`}
        >
          {t("sSortDate")}{" "}
          {sortBy === "date" && (
            <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>
          )}
        </button>
        <div className="view-toggle">
          <button
            type="button"
            aria-label={t("sViewGrid")}
            className={viewMode === "grid" ? "is-active" : ""}
            onClick={() => onSetView("grid")}
          >
            <LayoutGrid size={16} aria-hidden="true" fill={viewMode === "grid" ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            aria-label={t("sViewList")}
            className={viewMode === "list" ? "is-active" : ""}
            onClick={() => onSetView("list")}
          >
            <LayoutList size={16} aria-hidden="true" fill={viewMode === "list" ? "currentColor" : "none"} />
          </button>
        </div>
        <button
          type="button"
          className="search-share-btn"
          onClick={onShare}
          aria-label={t("sShareLabel")}
          title={t("sShareLabel")}
        >
          <Share2 size={16} aria-hidden="true" />
        </button>
        {shareConfirmation && (
          <span
            role="status"
            aria-live="polite"
            className={`search-share-pill search-share-pill--${shareConfirmation}`}
          >
            {shareConfirmation === "copied" ? t("sShareCopied") : t("sShareFailed")}
          </span>
        )}
      </div>
    </div>
  );
}
