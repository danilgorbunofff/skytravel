import { useCallback, useRef, useState } from "react";
import { fetchPublicProviderOfferGroup } from "../../../api/publicProviders";
import type { UnifiedFilters, UnifiedTour } from "../../../types/providers";

export interface OfferGroupsState {
  offerGroupItems: Record<string, UnifiedTour[]>;
  offerGroupLoading: Record<string, boolean>;
  offerGroupErrors: Record<string, string>;
  detailTour: UnifiedTour | null;
  openTourDetail: (tour: UnifiedTour) => void;
  closeDetail: () => void;
}

export function useOfferGroups(
  buildFilters: (options?: { includePaging?: boolean }) => UnifiedFilters,
): OfferGroupsState {
  const [offerGroupItems, setOfferGroupItems] = useState<Record<string, UnifiedTour[]>>({});
  const [offerGroupLoading, setOfferGroupLoading] = useState<Record<string, boolean>>({});
  const [offerGroupErrors, setOfferGroupErrors] = useState<Record<string, string>>({});
  const [detailTour, setDetailTour] = useState<UnifiedTour | null>(null);
  const offerGroupControllers = useRef<Map<string, AbortController>>(new Map());

  const openTourDetail = useCallback(
    (tour: UnifiedTour) => {
      const key = tour.offerGroupKey;
      setDetailTour(tour);
      if (!key || (tour.offersCount ?? 0) <= 1 || offerGroupItems[key]) return;

      // Cancel any previous in-flight fetch for the same offer group
      const previous = offerGroupControllers.current.get(key);
      previous?.abort();
      const controller = new AbortController();
      offerGroupControllers.current.set(key, controller);

      setOfferGroupLoading((prev) => ({ ...prev, [key]: true }));
      setOfferGroupErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });

      fetchPublicProviderOfferGroup(
        tour.source,
        key,
        buildFilters({ includePaging: false }),
        controller.signal,
      )
        .then((items) => {
          if (offerGroupControllers.current.get(key) !== controller) return;
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
    },
    [buildFilters, offerGroupItems],
  );

  const closeDetail = useCallback(() => {
    setDetailTour(null);
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
