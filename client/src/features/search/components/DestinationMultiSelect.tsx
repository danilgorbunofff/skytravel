import { useEffect, useRef, useState } from "react";
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

  const COLLAPSED = 6;
  const alwaysVisible = sorted.slice(0, COLLAPSED);
  const extraItems = sorted.slice(COLLAPSED);
  const hasOverflow = extraItems.length > 0;
  const hiddenCount = extraItems.length;

  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (!hasOverflow) return;
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setMeasuredHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // also re-measure after fonts load / counts update
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hasOverflow, extraItems.length]);

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
        {alwaysVisible.map((d) => {
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

        {hasOverflow && (
          <div
            className="search-region-list__extra"
            aria-hidden={!expanded}
            style={{
              height: expanded ? measuredHeight : 0,
              opacity: expanded ? 1 : 0,
            }}
          >
            <div ref={innerRef} className="search-region-list__extra-inner">
              {extraItems.map((d) => {
                const isActive = activeSlug === d.slug;
                return (
                  <button
                    key={d.slug}
                    type="button"
                    className={isActive ? "is-active" : ""}
                    onClick={() => toggle(d.slug)}
                    role="radio"
                    aria-checked={isActive}
                    tabIndex={expanded ? 0 : -1}
                  >
                    {d.czechName}
                    {d.count > 0 && <span className="region-count">({d.count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasOverflow && (
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
