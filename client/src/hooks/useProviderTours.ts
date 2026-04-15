import { useCallback, useState } from "react";

import {
  fetchProviderTours,
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

  const reset = useCallback(() => {
    setTours([]);
    setLoading(false);
    setError(null);
    setTotalCount(0);
    setFilteredCount(0);
    setPage(1);
    setTotalPages(0);
    setUniqueDestinations(0);
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
    loadTours,
    reset,
  };
}
