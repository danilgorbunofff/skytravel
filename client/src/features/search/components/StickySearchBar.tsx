import { fmtDate } from "../../../lib/formatters";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { localeForText } from "../../../lib/locale";

interface Props {
  t: (key: TranslationKey) => string;
  visible: boolean;
  activeQuery: string;
  activeDateStart: string;
  filteredCount: number | null;
}

export function StickySearchBar({
  t,
  visible,
  activeQuery,
  activeDateStart,
  filteredCount,
}: Props) {
  return (
    <div className={`sticky-search-bar${visible ? " is-visible" : ""}`}>
      <div className="container sticky-search-bar__inner">
        <span className="sticky-search-bar__query">
          {activeQuery || t("sStickyDefault")}
          {activeDateStart && ` · ${fmtDate(activeDateStart)}`}
        </span>
        <button
          type="button"
          className="sticky-search-bar__edit"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          {t("sStickyEdit")}
        </button>
        {filteredCount !== null && (
          <span className="sticky-search-bar__count">
            {filteredCount.toLocaleString(localeForText())} {t("sStickyOffers")}
          </span>
        )}
      </div>
    </div>
  );
}
