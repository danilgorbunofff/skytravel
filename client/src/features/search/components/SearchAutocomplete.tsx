import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Clock, Search } from "lucide-react";
import type { PublicDestinationSummary } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { formatPrice } from "../../../utils";
import { isPlausibleTourPrice } from "../../../lib/prices";
import { favorites as popularDestinations } from "../../../data";
import { useRecentSearches } from "../hooks/useRecentSearches";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

export interface Suggestion {
  type: "destination" | "recent";
  label: string;
  slug?: string;
  count?: number;
  minPrice?: number | null;
}

interface Props {
  t: (key: TranslationKey) => string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
  destinations: PublicDestinationSummary[];
  placeholder?: string;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getDestinationImage(destinationName: string): string | null {
  const normalizedName = normalize(destinationName);
  const match = popularDestinations.find((item) => {
    const normalizedFavorite = normalize(item.destination);
    return (
      normalizedName.includes(normalizedFavorite) || normalizedFavorite.includes(normalizedName)
    );
  });
  return match?.image ?? null;
}

export function SearchAutocomplete({
  t,
  value,
  onChange,
  onSelect,
  destinations,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceTimer = useRef<number | null>(null);

  // Recent searches come from a useSyncExternalStore-backed hook, so they are
  // read once per store change instead of hitting localStorage on every render.
  const { searches: recentSearches } = useRecentSearches();

  // Debounce input
  useEffect(() => {
    if (debounceTimer.current != null) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setDebouncedValue(value);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current != null) window.clearTimeout(debounceTimer.current);
    };
  }, [value]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const items: Suggestion[] = [];
    const normalizedInput = normalize(debouncedValue);

    if (normalizedInput.length >= MIN_CHARS) {
      const destMatches = destinations
        .filter((d) => {
          const normalizedCzech = normalize(d.czechName);
          const normalizedCanonical = normalize(d.canonicalName);
          return (
            normalizedCzech.includes(normalizedInput) ||
            normalizedCanonical.includes(normalizedInput)
          );
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      for (const d of destMatches) {
        items.push({
          type: "destination",
          label: d.czechName,
          slug: d.slug,
          count: d.count,
          minPrice: d.minPrice,
        });
      }
    }

    const recentMatches =
      normalizedInput.length >= 1
        ? recentSearches.filter((r) => normalize(r.query).includes(normalizedInput))
        : recentSearches;

    for (const r of recentMatches.slice(0, 4)) {
      if (!items.some((s) => s.label.toLowerCase() === r.query.toLowerCase())) {
        items.push({ type: "recent", label: r.query, count: r.resultCount });
      }
    }

    return items;
  }, [debouncedValue, destinations, recentSearches]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelectItem = useCallback(
    (suggestion: Suggestion) => {
      onChange(suggestion.label);
      onSelect(suggestion);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) {
        if (e.key === "ArrowDown" && suggestions.length > 0) {
          setOpen(true);
          setActiveIndex(0);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
          break;
        case "Enter":
          // Only swallow Enter when a suggestion is actually highlighted.
          // Otherwise let it bubble so the surrounding <form> submits the search.
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            e.preventDefault();
            handleSelectItem(suggestions[activeIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [open, suggestions, activeIndex, handleSelectItem],
  );

  function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query || query.length < MIN_CHARS) return text;
    const normalizedText = normalize(text);
    const normalizedQuery = normalize(query);
    const matchStart = normalizedText.indexOf(normalizedQuery);
    if (matchStart === -1) return text;
    const matchEnd = matchStart + normalizedQuery.length;
    return (
      <>
        {text.slice(0, matchStart)}
        <mark>{text.slice(matchStart, matchEnd)}</mark>
        {text.slice(matchEnd)}
      </>
    );
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <div className="search-autocomplete" ref={containerRef}>
      <div className="public-search-input">
        <MapPin size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t("sFormPlaceholder")}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="search-autocomplete-list"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <ul
          id="search-autocomplete-list"
          ref={listRef}
          className="search-autocomplete__dropdown"
          role="listbox"
        >
          {suggestions.map((s, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                key={`${s.type}-${s.label}`}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={isActive}
                className={`search-autocomplete__item${isActive ? " is-active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(s);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="search-autocomplete__icon">
                  {s.type === "destination" ? (
                    (() => {
                      const img = getDestinationImage(s.label);
                      return img ? (
                        <img
                          src={img}
                          alt=""
                          className="search-autocomplete__thumb"
                          width={24}
                          height={24}
                        />
                      ) : (
                        <MapPin size={14} aria-hidden="true" />
                      );
                    })()
                  ) : s.type === "recent" ? (
                    <Clock size={14} aria-hidden="true" />
                  ) : (
                    <Search size={14} aria-hidden="true" />
                  )}
                </span>
                <span className="search-autocomplete__label">
                  {highlightMatch(s.label, debouncedValue)}
                </span>
                {s.type === "destination" && (
                  <span className="search-autocomplete__meta">
                    {s.count != null && (
                      <span>
                        {s.count} {t("sStickyOffers")}
                      </span>
                    )}
                    {s.minPrice != null && isPlausibleTourPrice(s.minPrice) && (
                      <span className="search-autocomplete__price">
                        {t("from")} {formatPrice(s.minPrice)}
                      </span>
                    )}
                  </span>
                )}
                {s.type === "recent" && s.count != null && (
                  <span className="search-autocomplete__meta">
                    <span>
                      {s.count} {t("sStateHotels")}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
