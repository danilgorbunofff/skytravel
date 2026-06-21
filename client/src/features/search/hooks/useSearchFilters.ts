import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { UnifiedFilters } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { DEFAULT_PAGE_SIZE, DEFAULT_ADULTS, DEFAULT_CHILDREN } from "../constants";

function getParamNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parsePriceParam(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stableFilterKey(filters: UnifiedFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(filters).sort()) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export interface SearchFilterState {
  // Active filter values (from URL — source of truth)
  activeQuery: string;
  activeDateStart: string;
  activeDateEnd: string;
  activeTransport: string;
  activeDestinationSlug: string;
  activeNights: string;
  activeStars: string;
  activeBoard: string;
  activePriceMin: string;
  activePriceMax: string;
  page: number;
  limit: number;
  sortBy: "price" | "date";
  sortDir: "asc" | "desc";

  // Derived
  hasUserFilters: boolean;
  hasPriceFilter: boolean;

  // Local input state (not yet committed to URL)
  query: string;
  dateStart: string;
  dateEnd: string;
  transport: string;
  adults: number;
  children: number;

  // Validation
  dateError: string | null;
  validationError: string | null;

  // Actions
  setQuery: (v: string) => void;
  setDateStart: (v: string) => void;
  setDateEnd: (v: string) => void;
  setTransport: (v: string) => void;
  setAdults: (v: number | ((prev: number) => number)) => void;
  setChildren: (v: number | ((prev: number) => number)) => void;
  setValidationError: (v: string | null) => void;
  updateParams: (patch: Record<string, string | number | null | undefined>, replace?: boolean) => void;
  submitSearch: (event: React.FormEvent) => void;
  resetFilters: () => void;
  toggleSort: (field: "price" | "date") => void;
  pageTo: (page: number, totalPages: number) => void;

  // Filter building
  buildFilters: (options?: { forRegions?: boolean; includePaging?: boolean }) => UnifiedFilters;
  searchFilters: UnifiedFilters;
  searchFilterKey: string;
  filterKeyWithoutPage: string;
}

export function useSearchFilters(
  t: (key: TranslationKey) => string,
): SearchFilterState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Local input state (controlled inputs, committed on submit)
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [dateStart, setDateStart] = useState(searchParams.get("dateStart") ?? "");
  const [dateEnd, setDateEnd] = useState(searchParams.get("dateEnd") ?? "");
  const [transport, setTransport] = useState(searchParams.get("transport") ?? "");
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || DEFAULT_ADULTS);
  const [children, setChildren] = useState(Number(searchParams.get("children")) || DEFAULT_CHILDREN);

  // Sync local state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setDateStart(searchParams.get("dateStart") ?? "");
    setDateEnd(searchParams.get("dateEnd") ?? "");
    setTransport(searchParams.get("transport") ?? "");
    setAdults(Number(searchParams.get("adults")) || DEFAULT_ADULTS);
    setChildren(Number(searchParams.get("children")) || DEFAULT_CHILDREN);
  }, [searchParams]);

  // Read active URL params
  const page = getParamNumber(searchParams, "page", 1);
  const limit = getParamNumber(searchParams, "limit", DEFAULT_PAGE_SIZE);
  const sortBy = searchParams.get("sortBy") === "date" ? "date" : ("price" as const);
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : ("asc" as const);
  const activeQuery = searchParams.get("q")?.trim() ?? "";
  const activeDateStart = searchParams.get("dateStart") ?? "";
  const activeDateEnd = searchParams.get("dateEnd") ?? "";
  const activeTransport = searchParams.get("transport") ?? "";
  const activeDestinationSlug = searchParams.get("destinationSlug") ?? "";
  const activeNights = searchParams.get("nights") ?? "";
  const activeStars = searchParams.get("stars") ?? "";
  const activeBoard = searchParams.get("board") ?? "";
  const activePriceMin = searchParams.get("priceMin") ?? "";
  const activePriceMax = searchParams.get("priceMax") ?? "";
  const hasPriceFilter = Boolean(activePriceMin || activePriceMax);
  const hasUserFilters = Boolean(
    activeQuery ||
      activeDateStart ||
      activeDateEnd ||
      activeTransport ||
      activeDestinationSlug ||
      activeNights ||
      activeStars ||
      activeBoard ||
      hasPriceFilter,
  );

  const dateError =
    dateStart && dateEnd && dateStart > dateEnd ? (t("sValidationDateOrder") as string) : null;

  // Actions
  const updateParams = useCallback(
    (patch: Record<string, string | number | null | undefined>, replace = false) => {
      setValidationError(null);
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  const submitSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (dateError) {
        setValidationError(dateError);
        return;
      }
      setValidationError(null);
      updateParams({
        q: query.trim(),
        dateStart,
        dateEnd,
        transport,
        adults,
        children,
        page: 1,
      });
    },
    [dateError, query, dateStart, dateEnd, transport, adults, children, updateParams],
  );

  const resetFilters = useCallback(() => {
    const current = new URLSearchParams(searchParams);
    const preserved: [string, string][] = [];
    // Preserve search query
    const q = current.get("q");
    if (q) preserved.push(["q", q]);
    // Preserve adults and children from hero section
    const adults = current.get("adults");
    if (adults) preserved.push(["adults", adults]);
    const children = current.get("children");
    if (children) preserved.push(["children", children]);

    const next = new URLSearchParams(preserved);
    setSearchParams(next);
    setValidationError(null);
  }, [setSearchParams, searchParams]);

  const toggleSort = useCallback(
    (nextSortBy: "price" | "date") => {
      const nextSortDir = sortBy === nextSortBy && sortDir === "asc" ? "desc" : "asc";
      updateParams({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
    },
    [sortBy, sortDir, updateParams],
  );

  const pageTo = useCallback(
    (nextPage: number, totalPages: number) => {
      if (nextPage < 1 || nextPage > totalPages) return;
      updateParams({ page: nextPage });
    },
    [updateParams],
  );

  const buildFilters = useCallback(
    (options: { forRegions?: boolean; includePaging?: boolean } = {}): UnifiedFilters => {
      const filters: UnifiedFilters = {
        sortBy,
        sortDir,
      };
      if (options.includePaging !== false) {
        filters.page = page;
        filters.limit = limit;
      }
      const q = searchParams.get("q")?.trim();
      const start = searchParams.get("dateStart");
      const end = searchParams.get("dateEnd");
      const urlTransport = searchParams.get("transport");
      const urlStars = searchParams.get("stars");
      const urlBoard = searchParams.get("board");
      const urlNights = searchParams.get("nights");
      const destinationSlug = searchParams.get("destinationSlug");

      if (q) filters.q = q;
      if (destinationSlug) filters.destinationSlug = destinationSlug;
      if (start) filters.dateStart = start;
      if (end) filters.dateEnd = end;
      if (urlTransport) filters.transport = urlTransport;
      if (urlStars) filters.stars = urlStars;
      if (urlBoard) filters.board = urlBoard;
      if (urlNights) filters.nights = urlNights;
      const pMin = searchParams.get("priceMin");
      const pMax = searchParams.get("priceMax");
      if (pMin) filters.priceMin = Number(pMin);
      if (pMax) filters.priceMax = Number(pMax);
      const adultCount = searchParams.get("adults");
      const childCount = searchParams.get("children");
      if (adultCount) filters.adults = Number(adultCount);
      if (childCount) filters.children = Number(childCount);
      if (searchParams.get("hotelOnly") === "1") filters.hotelOnly = "1";
      return filters;
    },
    [searchParams, page, limit, sortBy, sortDir],
  );

  const searchFilters = useMemo(() => buildFilters(), [buildFilters]);
  const searchFilterKey = useMemo(() => stableFilterKey(searchFilters), [searchFilters]);
  const filterKeyWithoutPage = useMemo(() => {
    const { page: _page, ...rest } = searchFilters as UnifiedFilters & { page?: number };
    void _page;
    return stableFilterKey(rest as UnifiedFilters);
  }, [searchFilters]);

  return {
    activeQuery,
    activeDateStart,
    activeDateEnd,
    activeTransport,
    activeDestinationSlug,
    activeNights,
    activeStars,
    activeBoard,
    activePriceMin,
    activePriceMax,
    page,
    limit,
    sortBy,
    sortDir,
    hasUserFilters,
    hasPriceFilter,
    query,
    dateStart,
    dateEnd,
    transport,
    adults,
    children,
    dateError,
    validationError,
    setQuery,
    setDateStart,
    setDateEnd,
    setTransport,
    setAdults,
    setChildren,
    setValidationError,
    updateParams,
    submitSearch,
    resetFilters,
    toggleSort,
    pageTo,
    buildFilters,
    searchFilters,
    searchFilterKey,
    filterKeyWithoutPage,
  };
}

export { parsePriceParam };
