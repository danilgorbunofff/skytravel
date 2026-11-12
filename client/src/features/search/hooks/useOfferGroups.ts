import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPublicProviderOfferGroup, fetchPublicSingleTour } from "../../../api/publicProviders";
import type { UnifiedFilters, UnifiedTour } from "../../../types/providers";

export interface OfferGroupsState {
  offerGroupItems: Record<string, UnifiedTour[]>;
  offerGroupLoading: Record<string, boolean>;
  offerGroupErrors: Record<string, string>;
  detailTour: UnifiedTour | null;
  openTourDetail: (tour: UnifiedTour) => void;
  closeDetail: () => void;
}

// Search-result cards come from `omitHeavy` queries, so they carry no `photos`
// and no description — only `image`. When such a card is opened in the detail
// modal, the full row is fetched so the gallery, tabs and share link get the
// same data a page reload (deep link) would deliver.
export function needsHydration(tour: UnifiedTour): boolean {
  const hasPhotos = Boolean(tour.photos?.some((p) => typeof p === "string" && p.length > 0));
  return !hasPhotos || !tour.description;
}

export function useOfferGroups(
  buildFilters: (options?: { includePaging?: boolean }) => UnifiedFilters,
): OfferGroupsState {
  const [offerGroupItems, setOfferGroupItems] = useState<Record<string, UnifiedTour[]>>({});
  const [offerGroupLoading, setOfferGroupLoading] = useState<Record<string, boolean>>({});
  const [offerGroupErrors, setOfferGroupErrors] = useState<Record<string, string>>({});
  const [detailTour, setDetailTour] = useState<UnifiedTour | null>(null);
  const offerGroupControllers = useRef<Map<string, AbortController>>(new Map());
  const hydrateController = useRef<AbortController | null>(null);

  // `buildFilters` gets a new identity on every URL change. Reading it through
  // a ref keeps `openTourDetail` referentially stable, which is what lets
  // React.memo on PublicTourCard actually hold.
  const buildFiltersRef = useRef(buildFilters);
  buildFiltersRef.current = buildFilters;
  const offerGroupItemsRef = useRef(offerGroupItems);
  offerGroupItemsRef.current = offerGroupItems;

  const openTourDetail = useCallback((tour: UnifiedTour) => {
    const key = tour.offerGroupKey;
    setDetailTour(tour);
    // Cancel any previous in-flight fetches for a previously opened tour.
    hydrateController.current?.abort();
    offerGroupControllers.current.forEach((c) => c.abort());
    offerGroupControllers.current.clear();

    const controller = new AbortController();
    hydrateController.current = controller;

    // Card rows are fetched without heavy fields; fetch the full row so the
    // modal shows the complete photo gallery right away.
    if (needsHydration(tour)) {
      fetchPublicSingleTour(tour.source, tour.externalId, controller.signal)
        .then((full) => {
          if (controller.signal.aborted) return;
          setDetailTour((prev) =>
            prev && `${prev.source}-${prev.externalId}` === `${tour.source}-${tour.externalId}`
              ? full
              : prev,
          );
        })
        .catch((err) => {
          if ((err as { name?: string })?.name === "AbortError") return;
          // Keep the card data; the gallery still has the fallback image.
        });
    }

    if (!key || (tour.offersCount ?? 0) <= 1 || offerGroupItemsRef.current[key]) return;

    offerGroupControllers.current.set(key, controller);

    setOfferGroupLoading((prev) => ({ ...prev, [key]: true }));
    setOfferGroupErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });

    fetchPublicProviderOfferGroup(
      tour.source,
      key,
      buildFiltersRef.current({ includePaging: false }),
      controller.signal,
    )
      .then((items) => {
        if (offerGroupControllers.current.get(key) !== controller) return;
        // Don't cache empty results — leave the slot unset so a later
        // open of the same group can retry the fetch.
        if (items.length === 0) return;
        setOfferGroupItems((prev) => ({
          ...prev,
          [key]: items,
        }));
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (offerGroupControllers.current.get(key) !== controller) return;
        setOfferGroupErrors((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Termíny se nepodařilo načíst.",
        }));
      })
      .finally(() => {
        if (offerGroupControllers.current.get(key) !== controller) return;
        offerGroupControllers.current.delete(key);
        setOfferGroupLoading((prev) => ({ ...prev, [key]: false }));
      });
  }, []);

  const closeDetail = useCallback(() => {
    hydrateController.current?.abort();
    offerGroupControllers.current.forEach((c) => c.abort());
    offerGroupControllers.current.clear();
    setDetailTour(null);
  }, []);

  useEffect(() => {
    const controllers = offerGroupControllers.current;
    const hydrate = hydrateController.current;
    return () => {
      controllers.forEach((c) => c.abort());
      controllers.clear();
      hydrate?.abort();
    };
  }, []);

  return {
    offerGroupItems,
    offerGroupLoading,
    offerGroupErrors,
    detailTour,
    openTourDetail,
    closeDetail,
  };
}
