import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchProviderTours,
  streamProviderTours,
} from "../api/providers";
import type { UnifiedFilters, UnifiedTour } from "../types/providers";

export function useProviderTours() {
  const [tours, setTours] = useState<UnifiedTour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [uniqueDestinations, setUniqueDestinations] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [streamLoaded, setStreamLoaded] = useState(0);

  const closeRef = useRef<(() => void) | null>(null);

  // Cancel any active stream on unmount
  useEffect(() => {
    return () => {
      closeRef.current?.();
    };
  }, []);

  const loadTours = useCallback(
    async (providerId: string, filters: UnifiedFilters) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchProviderTours(providerId, filters);
        setTours(result.items);
        setTotalCount(result.total);
        setFilteredCount(result.filtered);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setUniqueDestinations(result.uniqueDestinations);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadToursStream = useCallback(
    (providerId: string, filters: UnifiedFilters) => {
      // Cancel previous stream if any
      closeRef.current?.();

      setStreaming(true);
      setStreamLoaded(0);
      setTours([]);
      setError(null);

      const close = streamProviderTours(providerId, filters, {
        onBatch(items, loaded) {
          setTours((prev) => [...prev, ...items]);
          setStreamLoaded(loaded);
        },
        onDone(_total) {
          setStreaming(false);
          // Fetch the properly sorted/paginated first page
          loadTours(providerId, filters);
        },
        onError(err) {
          setStreaming(false);
          setError(err.message);
        },
      });

      closeRef.current = close;
      return close;
    },
    [loadTours],
  );

  const reset = useCallback(() => {
    closeRef.current?.();
    closeRef.current = null;
    setTours([]);
    setLoading(false);
    setError(null);
    setTotalCount(0);
    setFilteredCount(0);
    setPage(1);
    setTotalPages(0);
    setUniqueDestinations(0);
    setStreaming(false);
    setStreamLoaded(0);
  }, []);

  return {
    tours,
    loading,
    error,
    totalCount,
    filteredCount,
    page,
    totalPages,
    uniqueDestinations,
    streaming,
    streamLoaded,
    loadTours,
    loadToursStream,
    reset,
  };
}
