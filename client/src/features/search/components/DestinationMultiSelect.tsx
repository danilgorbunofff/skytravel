import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
  const activeSlugs = value ? value.split(",").filter(Boolean) : [];

  const sorted = [...destinations].sort((a, b) => {
    const aActive = activeSlugs.includes(a.slug);
    const bActive = activeSlugs.includes(b.slug);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (a.count !== b.count) return b.count - a.count;
    return a.czechName.localeCompare(b.czechName, "cs-CZ");
  });

  const visible = expanded ? sorted : sorted.slice(0, 6);
  const hiddenCount = Math.max(sorted.length - 6, 0);

  function toggle(slug: string) {
    if (activeSlugs.includes(slug)) {
      const next = activeSlugs.filter((s) => s !== slug);
      onChange(next.join(","));
    } else {
      onChange([...activeSlugs, slug].join(","));
    }
  }

  function clearAll() {
    onChange("");
  }

  return (
    <div className="destination-multi-select">
      {/* Selected chips */}
      {activeSlugs.length > 0 && (
        <div className="destination-multi-select__chips">
          {activeSlugs.map((slug) => {
            const dest = destinations.find((d) => d.slug === slug);
            return (
              <button
                key={slug}
                type="button"
                className="destination-multi-select__chip"
                onClick={() => toggle(slug)}
              >
                {dest?.czechName ?? slug}
                <X size={12} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="search-region-list">
        <button
          type="button"
          className={activeSlugs.length === 0 ? "is-active" : ""}
          onClick={clearAll}
        >
          {t("sFilterAllDestinations")}
        </button>
        {visible.map((d) => {
          const isActive = activeSlugs.includes(d.slug);
          return (
            <button
              key={d.slug}
              type="button"
              className={isActive ? "is-active" : ""}
              onClick={() => toggle(d.slug)}
              aria-pressed={isActive}
            >
              <span className="destination-multi-select__check">
                {isActive ? "☑" : "☐"}
              </span>
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
