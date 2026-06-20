import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";
import type { PublicDestinationSummary } from "../../../types/providers";

interface Props {
  t: (key: TranslationKey) => string;
  /** Comma-separated destination slugs, e.g. "egypt,turkey" */
  value: string;
  onChange: (value: string) => void;
  destinations: PublicDestinationSummary[];
}

export function DestinationMultiSelect({ t, value, onChange, destinations }: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeSlug = value || "";

  const sorted = [...destinations].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.czechName.localeCompare(b.czechName, "cs-CZ");
  });

  const visible = expanded ? sorted : sorted.slice(0, 6);
  const hiddenCount = Math.max(sorted.length - 6, 0);

  function toggle(slug: string) {
    if (activeSlug === slug) {
      onChange("");
    } else {
      onChange(slug);
    }
  }

  function clearAll() {
    onChange("");
  }

  return (
    <div className="destination-multi-select">
      {/* List */}
      <div className="search-region-list" role="radiogroup" aria-label={t("sDestination")}>
        <button
          type="button"
          className={!activeSlug ? "is-active" : ""}
          onClick={clearAll}
          role="radio"
          aria-checked={!activeSlug}
        >
          {t("sFilterAllDestinations")}
        </button>
        {visible.map((d) => {
          const isActive = activeSlug === d.slug;
          return (
            <button
              key={d.slug}
              type="button"
              className={isActive ? "is-active" : ""}
              onClick={() => toggle(d.slug)}
              role="radio"
              aria-checked={isActive}
            >
              {d.czechName}
              {d.count > 0 && <span className="region-count">({d.count})</span>}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="search-region-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp size={13} />
                {t("sFilterShowLessDestinations")}
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                {t("sFilterShowAllDestinations")} ({hiddenCount})
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
