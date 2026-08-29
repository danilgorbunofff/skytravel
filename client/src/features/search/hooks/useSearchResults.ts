import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** Retries the last request. Safe to call when idle or errored. */
  retry: () => void;
  /** True once any request has succeeded — keeps the price slider mounted. */
  hasLoadedOnce: boolean;
  /** True when the URL page and the last loaded page disagree (in-flight page change). */
  pendingPage: boolean;
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
  favoriteTours: UnifiedTour[] = [],
): SearchResultsState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The result is stored together with the filter key that produced it, so a
  // response for a stale filter set can never be rendered (previously page-5
  // items were displayed next to a "page 1" pagination state).
  const [resultState, setResultState] = useState<{ key: string; data: ToursResult } | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<UnifiedTour[]>([]);
  const [naturalPriceRange, setNaturalPriceRange] = useState({
    min: MIN_PUBLIC_TOUR_PRICE_CZK,
    max: 200_000,
  });

  // Reset accumulator when the filter set changes (but not on page change).
  const accumulatedKeyRef = useRef(filterKeyWithoutPage);
  useEffect(() => {
    if (accumulatedKeyRef.current !== filterKeyWithoutPage) {
      accumulatedKeyRef.current = filterKeyWithoutPage;
      setAccumulatedItems([]);
    }
  }, [filterKeyWithoutPage]);

  const debouncedFilterKey = useDebounce(searchFilterKey, 300);
  // Between the URL changing and the debounce settling we are conceptually
  // already loading — surfacing that avoids a 300 ms window where stale data is
  // shown as if it were current, and where "load more" is still clickable.
  const isDebouncePending = searchFilterKey !== debouncedFilterKey;

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const requestKey = debouncedFilterKey;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    // Clear the previous error immediately: a retry or a new filter set is a
    // fresh attempt. The previous *result* is deliberately kept so the list
    // doesn't collapse while the new one is in flight.
    setError(null);
    fetchPublicAllProviderTours(searchFilters, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResultState({ key: requestKey, data });
        setHasLoadedOnce(true);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Vyhledávání se nezdařilo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterKey, reloadToken]);

  // Only the result matching the currently committed filter key is visible.
  const result = resultState?.key === debouncedFilterKey ? resultState.data : null;

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  // Compare the URL page against the page we last actually loaded. Using the
  // stored (rather than the visible) result keeps this true across the debounce
  // window, which is exactly when a second "load more" tap used to slip through.
  const pendingPage = page !== (resultState?.data?.page ?? page);

  // Accumulate items for mobile infinite scroll. Gated on the key-matched
  // result only, so stale responses can never be appended.
  useEffect(() => {
    if (!result) return;
    setAccumulatedItems((prev) => {
      if (result.page <= 1) return result.items;
      const seen = new Set(prev.map((tour) => `${tour.source}-${tour.externalId}`));
      const additions = result.items.filter(
        (tour) => !seen.has(`${tour.source}-${tour.externalId}`),
      );
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [result]);

  // Update natural price range when results change
  useEffect(() => {
    if (result?.items.length) {
      const prices = result.items.map((t) => t.price).filter(isPlausibleTourPrice);
      if (prices.length === 0) return;
      const newMin = Math.floor(Math.min(...prices) / 500) * 500;
      const newMax = Math.ceil(Math.max(...prices) / 500) * 500;
      setNaturalPriceRange((prev) =>
        prev.min === newMin && prev.max === newMax ? prev : { min: newMin, max: newMax },
      );
    }
  }, [result]);

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

  // When showFavoritesOnly is active, show ALL saved tours instead of filtered API results
  const displayedTours = useMemo(() => {
    if (showFavoritesOnly) return favoriteTours;
    return result?.items ?? [];
  }, [result, showFavoritesOnly, favoriteTours]);

  // Fake result for favories-only mode so pagination/toolbar work
  const activeResult: ToursResult | null = useMemo(() => {
    if (!showFavoritesOnly) return result;
    if (favoriteTours.length === 0) {
      return {
        items: [],
        total: 0,
        filtered: 0,
        totalPages: 0,
        page: 1,
        limit: 0,
        uniqueDestinations: 0,
      };
    }
    return {
      items: favoriteTours,
      total: favoriteTours.length,
      filtered: favoriteTours.length,
      totalPages: 1,
      page: 1,
      limit: favoriteTours.length,
      uniqueDestinations: new Set(favoriteTours.map((t) => t.destination)).size,
    };
  }, [showFavoritesOnly, favoriteTours, result]);

  return {
    result: activeResult,
    resultsLoading: showFavoritesOnly ? false : isLoading || isDebouncePending,
    error: showFavoritesOnly ? null : error,
    retry,
    hasLoadedOnce,
    pendingPage: showFavoritesOnly ? false : pendingPage,
    displayedTours,
    accumulatedItems,
    naturalPriceRange,
    priceRange,
    priceMin,
    priceMax,
  };
}
