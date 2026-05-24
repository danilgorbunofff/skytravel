import { Clock, X } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { RecentSearch } from "../hooks/useRecentSearches";

interface Props {
  t: (key: TranslationKey) => string;
  searches: RecentSearch[];
  onSelect: (search: RecentSearch) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}

export function RecentSearches({ t, searches, onSelect, onRemove, onClear }: Props) {
  if (searches.length === 0) return null;

  return (
    <div className="recent-searches">
      <div className="recent-searches__header">
        <h3>{t("sRecentSearchesTitle")}</h3>
        <button type="button" className="recent-searches__clear" onClick={onClear}>
          {t("sRecentSearchesClear")}
        </button>
      </div>
      <ul className="recent-searches__list">
        {searches.slice(0, 5).map((s) => (
          <li key={`${s.query}-${s.timestamp}`} className="recent-searches__item">
            <button
              type="button"
              className="recent-searches__link"
              onClick={() => onSelect(s)}
            >
              <Clock size={14} aria-hidden="true" />
              <span className="recent-searches__query">{s.query}</span>
              {s.resultCount != null && (
                <span className="recent-searches__count">
                  ({s.resultCount})
                </span>
              )}
            </button>
            <button
              type="button"
              className="recent-searches__remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(s.query);
              }}
              aria-label={`Remove "${s.query}"`}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
