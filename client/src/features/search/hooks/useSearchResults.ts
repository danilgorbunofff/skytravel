import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPublicAllProviderTours } from "../../../api/publicProviders";
import type { ToursResult, UnifiedFilters, UnifiedTour } from "../../../types/providers";
import { isPlausibleTourPrice, MIN_PUBLIC_TOUR_PRICE_CZK } from "../../../lib/prices";
import { parsePriceParam } from "./useSearchFilters";
import { useDebounce } from "./useDebounce";

const FULL_PRICE_RANGE = { min: MIN_PUBLIC_TOUR_PRICE_CZK, max: 200_000 };

export interface SearchResultsState {
  result: ToursResult | null;
  resultsLoading: boolean;
  error: string | null;
  displayedTours: UnifiedTour[];
  accumulatedItems: UnifiedTour[];
  naturalPriceRange: { min: number; max: number };
  priceRange: { min: number; max: number };
  priceMin: number;
  priceMax: number;
}

export function useSearchResults(
  searchFilterKey: string,
  searchFilters: UnifiedFilters,
  filterKeyWithoutPage: string,
  activePriceMin: string,
  activePriceMax: string,
  showFavoritesOnly: boolean,
  favorites: string[],
  page: number,
): SearchResultsState {
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToursResult | null>(null);
  const [accumulatedItems, setAccumulatedItems] = useState<UnifiedTour[]>([]);
  const [naturalPriceRange, setNaturalPriceRange] = useState({
    min: MIN_PUBLIC_TOUR_PRICE_CZK,
    max: 200_000,
  });

  // Reset accumulator when filter changes (but not page)
  useEffect(() => {
    setAccumulatedItems([]);
  }, [filterKeyWithoutPage]);

  // Accumulate items for mobile infinite scroll
  useEffect(() => {
    if (!result) return;
    setAccumulatedItems((prev) => {
      if (page <= 1) return result.items;
      const seen = new Set(prev.map((tour) => `${tour.source}-${tour.externalId}`));
      const additions = result.items.filter(
        (tour) => !seen.has(`${tour.source}-${tour.externalId}`),
      );
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [result, page]);

  // Fetch results on filter change (debounced + abort)
  const debouncedFilterKey = useDebounce(searchFilterKey, 300);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResultsLoading(true);
    setError(null);
    fetchPublicAllProviderTours(searchFilters, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(err instanceof Error ? err.message : "Vyhledávání se nezdařilo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setResultsLoading(false);
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterKey]);

  // Update natural price range when results change
  useEffect(() => {
    if (!activePriceMin && !activePriceMax && result?.items.length) {
      const prices = result.items.map((t) => t.price).filter(isPlausibleTourPrice);
      if (prices.length === 0) return;
      const newMin = Math.floor(Math.min(...prices) / 500) * 500;
      const newMax = Math.ceil(Math.max(...prices) / 500) * 500;
      setNaturalPriceRange((prev) =>
        prev.min === newMin && prev.max === newMax ? prev : { min: newMin, max: newMax },
      );
    }
  }, [result, activePriceMin, activePriceMax]);

  const priceRange = FULL_PRICE_RANGE;

  // Clamped price values for slider
  const requestedPriceMin = parsePriceParam(activePriceMin);
  const requestedPriceMax = parsePriceParam(activePriceMax);
  const priceMin =
    requestedPriceMin === null
      ? naturalPriceRange.min
      : Math.min(Math.max(requestedPriceMin, FULL_PRICE_RANGE.min), FULL_PRICE_RANGE.max);
  const priceMax =
    requestedPriceMax === null
      ? naturalPriceRange.max
      : Math.min(Math.max(requestedPriceMax, FULL_PRICE_RANGE.min), FULL_PRICE_RANGE.max);

  // Filter displayed tours (favorites-only toggle)
  const displayedTours = useMemo(() => {
    let items = result?.items ?? [];
    if (showFavoritesOnly) {
      items = items.filter((tour) => favorites.includes(`${tour.source}-${tour.externalId}`));
    }
    return items;
  }, [result, showFavoritesOnly, favorites]);

  return {
    result,
    resultsLoading,
    error,
    displayedTours,
    accumulatedItems,
    naturalPriceRange,
    priceRange,
    priceMin,
    priceMax,
  };
}
