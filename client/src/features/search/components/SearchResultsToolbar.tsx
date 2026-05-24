import { LayoutGrid, LayoutList, Share2 } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { ViewMode, SortField } from "../types";

interface Props {
  t: (key: TranslationKey) => string;
  totalText: string;
  toolbarDescription: string;
  displayedCount: number;
  totalCount: number | null;
  filteredCount: number | null;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  viewMode: ViewMode;
  shareConfirmation: "copied" | "failed" | null;
  onToggleSort: (field: SortField) => void;
  onSetView: (mode: ViewMode) => void;
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
      <div>
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
            <LayoutGrid size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t("sViewList")}
            className={viewMode === "list" ? "is-active" : ""}
            onClick={() => onSetView("list")}
          >
            <LayoutList size={16} aria-hidden="true" />
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
