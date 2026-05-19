/**
 * Public search page.
 *
 * State management:
 * - Source of truth for query/filters is the URL (`useSearchParams`); local
 *   `useState` is reserved for transient UI (drawer open, share toast, etc.).
 * - Intentionally does NOT use `stores/searchStore` (admin-only) or the
 *   `useProviderTours` hook (used by admin tables). Mixing them here would
 *   create duplicate sources of truth and cause filter/URL drift.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ChevronUp, Heart, LayoutGrid, LayoutList, MapPin, Plane, RotateCcw, Search, Share2 } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { useLeadPopup } from "../hooks/useLeadPopup";
import LeadPopup from "../components/LeadPopup";
import {
  fetchPublicAllProviderTours,
  fetchPublicProviderOfferGroup,
} from "../api/publicProviders";
import { loadBootstrap } from "../api/bootstrapCache";
import { loadDestinations as loadDestinationsCache } from "../api/destinationsCache";
import type { ProviderMeta, PublicDestinationSummary, ToursResult, UnifiedFilters, UnifiedTour } from "../types/providers";
import { useLanguage } from "../hooks/useLanguage";
import type { TranslationKey } from "../hooks/useLanguage";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import { PriceRangeSlider } from "../components/PriceRangeSlider";
import { TourDetailModal } from "../components/TourDetailModal";
import { buildSrcSet } from "../lib/images";
import { fmtDate } from "../lib/formatters";
import { MIN_PUBLIC_TOUR_PRICE_CZK, isPlausibleTourPrice } from "../lib/prices";
import "../site.css";

const fallbackDestinationAliases: Record<string, string> = {
  bulgaria: "bulharsko",
  egypt: "egypt",
  greece: "recko",
  tunisia: "tunisko",
  turkey: "turecko",
};

function normalizeFallbackText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parsePriceParam(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTourFallbackImage(destination: string): string {
  const cached = fallbackImageCache.get(destination);
  if (cached !== undefined) return cached;
  const normalizedDestination = normalizeFallbackText(destination);
  const alias = Object.entries(fallbackDestinationAliases).find(([key]) => normalizedDestination.includes(key))?.[1];
  const match = popularDestinations.find((item) => {
    const normalizedFavorite = normalizeFallbackText(item.destination);
    return normalizedDestination.includes(normalizedFavorite) || (alias != null && normalizedFavorite.includes(alias));
  });
  const resolved = match?.image ?? "/placeholder-tour.svg";
  fallbackImageCache.set(destination, resolved);
  return resolved;
}

const fallbackImageCache = new Map<string, string>();

function stableFilterKey(filters: UnifiedFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(filters).sort()) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function getParamNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default function SearchPage() {
  const { lang, setLang, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const transportLabel: Record<string, string> = {
    plane: t("sTransportPlane"),
    bus: t("sTransportBus"),
    train: t("train"),
    car: t("sTransportCar"),
    boat: t("boat"),
  };
  const TRANSPORT_OPTIONS = [
    { value: "plane", label: t("sTransportPlane") },
    { value: "bus", label: t("sTransportBus") },
    { value: "car", label: t("sTransportCar") },
  ];
  const NIGHTS_OPTIONS = [
    { value: "", label: t("sNightsAny") },
    { value: "1-6", label: t("sNightsShort") },
    { value: "7-9", label: t("sNights79") },
    { value: "10-13", label: t("sNights1013") },
    { value: "14-99", label: t("sNights14") },
  ];
  const BOARD_OPTIONS = [
    { value: "AI", label: t("sBoardAI") },
    { value: "UAI", label: t("sBoardUAI") },
    { value: "FB", label: t("sBoardFB") },
    { value: "HB", label: t("sBoardHB") },
    { value: "BB", label: t("sBoardBB") },
    { value: "RO", label: t("sBoardRO") },
  ];
  const PRESETS = [
    { label: t("sPresetLastMin"), params: { dateStart: new Date().toISOString().slice(0, 10), dateEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) } },
    { label: t("sPresetAllInc"), params: { board: "AI" } },
    { label: t("sPresetFamily"), params: { board: "AI", nights: "7-13" } },
    { label: t("sPresetShort"), params: { nights: "1-6" } },
  ];

  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  type DestinationsState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; items: PublicDestinationSummary[] };
  const [destinationsState, setDestinationsState] = useState<DestinationsState>({ status: "loading" });
  const destinations = destinationsState.status === "ready" ? destinationsState.items : [];
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<ToursResult | null>(null);
  const [offerGroupItems, setOfferGroupItems] = useState<Record<string, UnifiedTour[]>>({});
  const [offerGroupLoading, setOfferGroupLoading] = useState<Record<string, boolean>>({});
  const [offerGroupErrors, setOfferGroupErrors] = useState<Record<string, string>>({});
  const [detailTour, setDetailTour] = useState<UnifiedTour | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try { return (localStorage.getItem("skytravel:viewMode") as "grid" | "list") ?? "grid"; } catch { return "grid"; }
  });

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const offerGroupControllers = useRef<Map<string, AbortController>>(new Map());
  const resultsSectionRef = useRef<HTMLElement | null>(null);
  const previousPageRef = useRef<number>(1);
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const leadPopup = useLeadPopup();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [heroExpanded, setHeroExpanded] = useState(() => !searchParams.get("q"));
  const [destinationsExpanded, setDestinationsExpanded] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState<"copied" | "failed" | null>(null);
  const shareTimeoutRef = useRef<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [accumulatedItems, setAccumulatedItems] = useState<UnifiedTour[]>([]);
  const [naturalPriceRange, setNaturalPriceRange] = useState({ min: MIN_PUBLIC_TOUR_PRICE_CZK, max: 200_000 });

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [dateStart, setDateStart] = useState(searchParams.get("dateStart") ?? "");
  const [dateEnd, setDateEnd] = useState(searchParams.get("dateEnd") ?? "");
  const [transport, setTransport] = useState(searchParams.get("transport") ?? "");
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = useState(Number(searchParams.get("children")) || 0);

  const providerLabels = useMemo(
    () => Object.fromEntries(providers.map((provider) => [provider.id, provider.label])),
    [providers],
  );
  const page = getParamNumber(searchParams, "page", 1);
  const limit = getParamNumber(searchParams, "limit", 24);
  const sortBy = searchParams.get("sortBy") === "date" ? "date" : "price";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
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
    activeQuery || activeDateStart || activeDateEnd || activeTransport || activeDestinationSlug || activeNights || activeStars || activeBoard || hasPriceFilter,
  );

  const priceRange = useMemo(() => {
    if (!result?.items.length) return naturalPriceRange;
    const prices = result.items.map((t) => t.price).filter(isPlausibleTourPrice);
    if (prices.length === 0) return naturalPriceRange;
    return {
      min: Math.floor(Math.min(...prices) / 500) * 500,
      max: Math.ceil(Math.max(...prices) / 500) * 500,
    };
  }, [result, naturalPriceRange]);

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

  useEffect(() => {
    const requestedPriceMax = parsePriceParam(activePriceMax);
    if (requestedPriceMax !== null && requestedPriceMax < naturalPriceRange.min) {
      const next = new URLSearchParams(searchParams);
      next.delete("priceMin");
      next.delete("priceMax");
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    }
  }, [activePriceMax, naturalPriceRange.min, searchParams, setSearchParams]);

  const requestedPriceMin = parsePriceParam(activePriceMin);
  const requestedPriceMax = parsePriceParam(activePriceMax);
  const priceMin = requestedPriceMin === null
    ? naturalPriceRange.min
    : Math.min(Math.max(requestedPriceMin, naturalPriceRange.min), naturalPriceRange.max);
  const priceMax = requestedPriceMax === null
    ? naturalPriceRange.max
    : Math.min(Math.max(requestedPriceMax, naturalPriceRange.min), naturalPriceRange.max);

  const applyLocalTourFilters = useCallback((sourceItems: UnifiedTour[], includeFavorites: boolean) => {
    let items = sourceItems;
    if (includeFavorites && showFavoritesOnly) {
      items = items.filter((tour) => favorites.includes(`${tour.source}-${tour.externalId}`));
    }
    return items;
  }, [showFavoritesOnly, favorites]);

  const displayedTours = useMemo(
    () => applyLocalTourFilters(result?.items ?? [], true),
    [result, applyLocalTourFilters],
  );

  const prioritizedDestinations = useMemo(() => {
    return [...destinations].sort((left, right) => {
      if (left.slug === activeDestinationSlug) return -1;
      if (right.slug === activeDestinationSlug) return 1;
      if (left.count !== right.count) return right.count - left.count;
      if (left.minPrice !== right.minPrice) {
        if (left.minPrice == null) return 1;
        if (right.minPrice == null) return -1;
        return left.minPrice - right.minPrice;
      }
      return left.czechName.localeCompare(right.czechName, "cs-CZ");
    });
  }, [activeDestinationSlug, destinations]);

  const visibleDestinations = useMemo(
    () => destinationsExpanded ? prioritizedDestinations : prioritizedDestinations.slice(0, 5),
    [destinationsExpanded, prioritizedDestinations],
  );

  const activeChips = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = [];
    if (activeQuery) chips.push({ label: `"${activeQuery}"`, onClear: () => updateParams({ q: null, page: 1 }) });
    if (activeDateStart) chips.push({ label: `${t("sChipFrom")} ${fmtDate(activeDateStart)}`, onClear: () => updateParams({ dateStart: null, page: 1 }) });
    if (activeDateEnd) chips.push({ label: `${t("sChipTo")} ${fmtDate(activeDateEnd)}`, onClear: () => updateParams({ dateEnd: null, page: 1 }) });
    if (activeTransport) chips.push({ label: transportLabel[activeTransport] ?? activeTransport, onClear: () => updateParams({ transport: null, page: 1 }) });
    if (activeDestinationSlug) {
      const destination = destinations.find((item) => item.slug === activeDestinationSlug);
      chips.push({ label: destination?.czechName ?? activeDestinationSlug, onClear: () => updateParams({ destinationSlug: null, page: 1 }) });
    }
    if (activeNights) {
      const opt = NIGHTS_OPTIONS.find((o) => o.value === activeNights);
      chips.push({ label: opt?.label ?? activeNights, onClear: () => updateParams({ nights: null, page: 1 }) });
    }
    if (activeStars) chips.push({ label: `★${activeStars}+`, onClear: () => updateParams({ stars: null, page: 1 }) });
    if (activeBoard) {
      const opt = BOARD_OPTIONS.find((o) => o.value === activeBoard);
      chips.push({ label: opt?.label ?? activeBoard, onClear: () => updateParams({ board: null, page: 1 }) });
    }
    if (activePriceMin || activePriceMax) {
      chips.push({
        label: `${t("sChipPrice")}: ${priceMin.toLocaleString("cs-CZ")} – ${priceMax.toLocaleString("cs-CZ")} Kč`,
        onClear: () => updateParams({ priceMin: null, priceMax: null, page: 1 }),
      });
    }
    if (showFavoritesOnly) {
      chips.push({ label: t("sChipFavorites"), onClear: () => setShowFavoritesOnly(false) });
    }
    return chips;
    // `destinations` is intentionally omitted: it's only used to look up the human-readable
    // label and is keyed by `activeDestinationSlug`. Re-deriving on every destination list
    // change would invalidate the memo every poll without producing different chip output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    priceMin,
    priceMax,
    priceRange,
    showFavoritesOnly,
    t,
  ]);

  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = loadBootstrap();

    function applyBootstrap(data: { providers: ProviderMeta[] }) {
      if (cancelled) return;
      setProviders(data.providers);
    }

    if (cached) {
      applyBootstrap(cached);
    }

    fresh
      .then((data) => {
        applyBootstrap(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : "Nepodařilo se načíst poskytovatele.");
        }
        // If we already rendered from cache, swallow the revalidation error.
      });

    return () => {
      cancelled = true;
    };
    // Bootstrap providers exactly once on mount. `loadBootstrap` is a stable
    // module-level helper and re-running on dep changes would refetch needlessly.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDestinations = useCallback(() => {
    let cancelled = false;
    const { cached, fresh } = loadDestinationsCache();

    if (cached) {
      setDestinationsState({
        status: "ready",
        items: cached.items.filter((item) => item.count > 0),
      });
    } else {
      setDestinationsState({ status: "loading" });
    }

    fresh
      .then((data) => {
        if (cancelled) return;
        setDestinationsState({
          status: "ready",
          items: data.items.filter((item) => item.count > 0),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          setDestinationsState({
            status: "error",
            message: err instanceof Error ? err.message : "Nepodařilo se načíst destinace.",
          });
        }
        // If we already rendered from cache, swallow the revalidation error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadDestinations();
    return cleanup;
  }, [loadDestinations]);

  // Abort any in-flight offer-group fetches when the page unmounts.
  useEffect(() => {
    const controllers = offerGroupControllers.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  // Scroll to results section after pagination has rendered the new page.
  useEffect(() => {
    if (previousPageRef.current === page) return;
    previousPageRef.current = page;
    if (resultsLoading) return;
    requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [page, result, resultsLoading]);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setDateStart(searchParams.get("dateStart") ?? "");
    setDateEnd(searchParams.get("dateEnd") ?? "");
    setTransport(searchParams.get("transport") ?? "");
    setAdults(Number(searchParams.get("adults")) || 2);
    setChildren(Number(searchParams.get("children")) || 0);
  }, [searchParams]);

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    function onScroll() { setPastHero(window.scrollY > 300); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const buildFilters = useCallback((options: { forRegions?: boolean; includePaging?: boolean } = {}): UnifiedFilters => {
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
    const activeTransport = searchParams.get("transport");
    const activeStarsFilter = searchParams.get("stars");
    const activeBoardFilter = searchParams.get("board");
    const activeNightsFilter = searchParams.get("nights");
    const destinationSlug = searchParams.get("destinationSlug");

    if (q) filters.q = q;
    if (destinationSlug) filters.destinationSlug = destinationSlug;
    if (start) filters.dateStart = start;
    if (end) filters.dateEnd = end;
    if (activeTransport) filters.transport = activeTransport;
    if (activeStarsFilter) filters.stars = activeStarsFilter;
    if (activeBoardFilter) filters.board = activeBoardFilter;
    if (activeNightsFilter) filters.nights = activeNightsFilter;
    const pMin = searchParams.get("priceMin");
    const pMax = searchParams.get("priceMax");
    if (pMin) filters.priceMin = Number(pMin);
    if (pMax) filters.priceMax = Number(pMax);
    const adultCount = searchParams.get("adults");
    const childCount = searchParams.get("children");
    if (adultCount) filters.adults = Number(adultCount);
    if (childCount) filters.children = Number(childCount);
    return filters;
  }, [searchParams, page, limit, sortBy, sortDir]);

  const searchFilters = useMemo(() => buildFilters(), [buildFilters]);
  const searchFilterKey = useMemo(() => stableFilterKey(searchFilters), [searchFilters]);
  // Key that ignores `page` — used to reset the mobile load-more accumulator
  // whenever any other filter changes.
  const filterKeyWithoutPage = useMemo(() => {
    const { page: _page, ...rest } = searchFilters as UnifiedFilters & { page?: number };
    void _page;
    return stableFilterKey(rest as UnifiedFilters);
  }, [searchFilters]);

  useEffect(() => {
    setAccumulatedItems([]);
  }, [filterKeyWithoutPage]);

  useEffect(() => {
    if (!result) return;
    setAccumulatedItems((prev) => {
      if (page <= 1) return result.items;
      const seen = new Set(prev.map((tour) => `${tour.source}-${tour.externalId}`));
      const additions = result.items.filter((tour) => !seen.has(`${tour.source}-${tour.externalId}`));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [result, page]);
  useEffect(() => {
    let cancelled = false;
    setResultsLoading(true);
    setError(null);
    fetchPublicAllProviderTours(searchFilters)
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setOfferGroupItems({});
          setOfferGroupLoading({});
          setOfferGroupErrors({});
          setDetailTour(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult(null);
          setError(err instanceof Error ? err.message : "Vyhledávání se nezdařilo.");
        }
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    }, [searchFilterKey]);

  useEffect(() => () => {
    if (shareTimeoutRef.current != null) window.clearTimeout(shareTimeoutRef.current);
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ url, title: document.title });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareConfirmation("copied");
      } else {
        setShareConfirmation("failed");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setShareConfirmation("failed");
      // eslint-disable-next-line no-console
      console.warn("share failed", err);
    } finally {
      if (shareTimeoutRef.current != null) window.clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = window.setTimeout(() => setShareConfirmation(null), 2500);
    }
  }, []);

  const openTourDetail = useCallback((tour: UnifiedTour) => {
    const key = tour.offerGroupKey;
    setDetailTour(tour);
    if (!key || (tour.offersCount ?? 0) <= 1 || offerGroupItems[key]) return;

    // Cancel any previous in-flight fetch for the same offer group so a late
    // response cannot overwrite the latest state.
    const previous = offerGroupControllers.current.get(key);
    previous?.abort();
    const controller = new AbortController();
    offerGroupControllers.current.set(key, controller);

    setOfferGroupLoading((prev) => ({ ...prev, [key]: true }));
    setOfferGroupErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    fetchPublicProviderOfferGroup(tour.source, key, buildFilters({ includePaging: false }), controller.signal)
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
  }, [buildFilters, offerGroupItems]);

  function updateParams(patch: Record<string, string | number | null | undefined>, replace = false) {
    setValidationError(null);
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    setSearchParams(next, { replace });
  }

  const dateError = dateStart && dateEnd && dateStart > dateEnd
    ? t("sValidationDateOrder")
    : null;

  function submitSearch(event: React.FormEvent) {
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
  }

  function setView(mode: "grid" | "list") {
    setViewMode(mode);
    try { localStorage.setItem("skytravel:viewMode", mode); } catch {}
  }

  function resetFilters() {
    const next = new URLSearchParams();
    setSearchParams(next);
    setValidationError(null);
    setShowFavoritesOnly(false);
    setDetailTour(null);
    setMobileFiltersOpen(false);
  }

  function toggleSort(nextSortBy: "price" | "date") {
    const nextSortDir = sortBy === nextSortBy && sortDir === "asc" ? "desc" : "asc";
    updateParams({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
  }

  function pageTo(nextPage: number) {
    if (nextPage < 1 || nextPage > (result?.totalPages || 1)) return;
    updateParams({ page: nextPage });
  }

  function renderDestinationList() {
    const hiddenDestinationCount = Math.max(prioritizedDestinations.length - 5, 0);
    return (
      <div className="search-region-list">
        <button
          type="button"
          className={!activeDestinationSlug ? "is-active" : ""}
          onClick={() => updateParams({ destinationSlug: null, page: 1 })}
        >
          {t("sFilterAllDestinations")}
        </button>
        {visibleDestinations.map((destination) => (
          <button
            key={destination.slug}
            type="button"
            className={activeDestinationSlug === destination.slug ? "is-active" : ""}
            onClick={() => updateParams({ destinationSlug: destination.slug, q: null, page: 1 })}
          >
            {destination.czechName}
            {destination.count > 0 && <span className="region-count">({destination.count})</span>}
          </button>
        ))}
        {hiddenDestinationCount > 0 && (
          <button
            type="button"
            className="search-region-toggle"
            aria-expanded={destinationsExpanded}
            onClick={() => setDestinationsExpanded((value) => !value)}
          >
            {destinationsExpanded ? (
              <><ChevronUp size={13} />{t("sFilterShowLessDestinations")}</>
            ) : (
              <><ChevronDown size={13} />{t("sFilterShowAllDestinations")} ({hiddenDestinationCount})</>
            )}
          </button>
        )}
      </div>
    );
  }

  const visibleFrom = result && result.filtered > 0 ? (result.page - 1) * result.limit + 1 : 0;
  const visibleTo = result ? Math.min(result.page * result.limit, result.filtered) : 0;
  const totalText = showFavoritesOnly
    ? `${displayedTours.length.toLocaleString("cs-CZ")} ${t("sStateSavedHotels")}`
    : result
      ? !hasUserFilters
        ? t("sBestDealsTitle")
        : `${t("sStateShown")} ${visibleFrom.toLocaleString("cs-CZ")}–${visibleTo.toLocaleString("cs-CZ")} ${t("sStateOf")} ${result.filtered.toLocaleString("cs-CZ")} ${t("sStateHotels")}${result.rawFilteredOffers && result.rawFilteredOffers > result.filtered ? ` (${result.rawFilteredOffers.toLocaleString("cs-CZ")} ${t("sStateTerms")})` : ""}`
      : resultsLoading
        ? t("sStateLoading")
        : hasUserFilters
          ? t("sStateNoOffers")
          : t("sBestDealsTitle");

  const toolbarDescription = !hasUserFilters ? t("sBestDealsBody") : t("sAllPartners");

  return (
    <div>
      <div className={`sticky-search-bar${pastHero ? " is-visible" : ""}`}>
        <div className="container sticky-search-bar__inner">
          <span className="sticky-search-bar__query">
            {activeQuery || t("sStickyDefault")}{activeDateStart && ` · ${fmtDate(activeDateStart)}`}
          </span>
          <button
            type="button"
            className="sticky-search-bar__edit"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {t("sStickyEdit")}
          </button>
          {result && (
            <span className="sticky-search-bar__count">
              {result.filtered.toLocaleString("cs-CZ")} {t("sStickyOffers")}
            </span>
          )}
        </div>
      </div>
      <header className="site-header">
        <div className="container header-top">
          <Link className="logo" to="/">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>

          <form className="top-search" onSubmit={submitSearch}>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setValidationError(null);
                setQuery(event.target.value);
              }}
              placeholder={t("searchPlaceholder")}
            />
            <button type="submit" aria-label={t("sFormSearch")}>GO</button>
          </form>

          <div className="header-contact-wrap desktop-only">
            <div className="header-contact">
              <a href="tel:+420721163860">+420 721 163 860</a>
              <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
            </div>
            <div className="lang-toggle" aria-label="Language switcher">
              {([
                { code: "cs", flag: "🇨🇿" },
                { code: "uk", flag: "🇺🇦" },
                { code: "en", flag: "🇬🇧" },
                { code: "ru", flag: "🇷🇺" },
              ] as const).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`lang-btn${lang === item.code ? " is-active" : ""}`}
                  onClick={() => setLang(item.code)}
                >
                  {item.flag}
                </button>
              ))}
            </div>
          </div>

          <div className="mobile-header-actions mobile-only">
            <div className="lang-toggle" aria-label="Language switcher">
              {([
                { code: "cs", flag: "🇨🇿" },
                { code: "uk", flag: "🇺🇦" },
                { code: "en", flag: "🇬🇧" },
                { code: "ru", flag: "🇷🇺" },
              ] as const).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`lang-btn${lang === item.code ? " is-active" : ""}`}
                  onClick={() => setLang(item.code)}
                >
                  {item.flag}
                </button>
              ))}
            </div>
            <button className="hamburger" type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <div className={`site-nav-wrapper ${mobileMenuOpen ? "is-open" : ""}`}>
          <div className="container site-nav-inner">
            <nav className="main-nav">
              <a href="/#vlastni">{t("navExclusive")}</a>
              <a href="/#allinclusive">{t("navPartner")}</a>
              <a href="/#destinace">{t("navTop")}</a>
              <a href="/#lastminute">Last minute</a>
              <a href="/#sluzby">{t("navServices")}</a>
              <a href="/#kontakt">{t("navContact")}</a>
              <Link to="/admin-login">{t("navAdmin")}</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="search-page">
        <section className="search-hero-section">
          <div className="container search-hero-grid">
            <div>
              <p className="search-eyebrow">SkyTravel search</p>
              <h1>{t("sHeroTitle")}</h1>
              <p>{t("sHeroSubtitle")}</p>
            </div>

            <form className="public-search-panel" onSubmit={submitSearch}>
              <label>
                <span>{t("sFormWhere")}</span>
                <div className="public-search-input">
                  <MapPin size={18} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setValidationError(null);
                      setQuery(event.target.value);
                    }}
                    placeholder={t("sFormPlaceholder")}
                  />
                </div>
              </label>
              <div className={`search-panel-extra${heroExpanded ? " is-open" : ""}`}>
              <label>
                <span>{t("sFormDeparture")}</span>
                <div className="public-search-input">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input
                    type="date"
                    max={dateEnd || undefined}
                    value={dateStart}
                    aria-invalid={!!dateError}
                    aria-describedby={dateError ? "search-date-error" : undefined}
                    onChange={(event) => {
                      setDateStart(event.target.value);
                      setValidationError(null);
                    }}
                  />
                </div>
              </label>
              <label>
                <span>{t("sFormReturn")}</span>
                <div className="public-search-input">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input
                    type="date"
                    min={dateStart || undefined}
                    value={dateEnd}
                    aria-invalid={!!dateError}
                    aria-describedby={dateError ? "search-date-error" : undefined}
                    onChange={(event) => {
                      setDateEnd(event.target.value);
                      setValidationError(null);
                    }}
                  />
                </div>
              </label>
              <label>
                <span>{t("sFormTransport")}</span>
                <div className="public-search-input">
                  <Plane size={18} aria-hidden="true" />
                  <select
                    value={transport}
                    onChange={(event) => {
                      setValidationError(null);
                      setTransport(event.target.value);
                    }}
                  >
                    <option value="">{t("sFormTransportAny")}</option>
                    {TRANSPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                <span>{t("sFormPeople")}</span>
                <div className="public-search-input guests-picker">
                  <div className="guests-stepper">
                    <div className="guests-stepper__row">
                      <span>{t("sFormAdults")}</span>
                      <div className="stepper">
                        <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))}>−</button>
                        <span>{adults}</span>
                        <button type="button" onClick={() => setAdults((a) => Math.min(9, a + 1))}>+</button>
                      </div>
                    </div>
                    <div className="guests-stepper__row">
                      <span>{t("sFormChildren")}</span>
                      <div className="stepper">
                        <button type="button" onClick={() => setChildren((c) => Math.max(0, c - 1))}>−</button>
                        <span>{children}</span>
                        <button type="button" onClick={() => setChildren((c) => Math.min(6, c + 1))}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
              </div>{/* /search-panel-extra */}
              <button
                type="button"
                className="search-panel-toggle mobile-only"
                onClick={() => setHeroExpanded((v) => !v)}
              >
                {heroExpanded ? t("sFormLess") : t("sFormMore")}
              </button>
              <button className="public-search-submit" type="submit" disabled={!!dateError} aria-disabled={!!dateError}>
                <Search size={18} aria-hidden="true" />
                {t("sFormSearch")}
              </button>
            </form>
            {(dateError || validationError) && (
              <p
                id="search-date-error"
                role="alert"
                className="search-validation"
              >
                {dateError ?? validationError}
              </p>
            )}
          </div>
        </section>

        <div className="trust-bar">
          <div className="container trust-bar__inner">
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>{t("sTrustVerified")}</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>{t("sTrustInsured")}</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>{t("sTrustNoFees")}</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>{t("sTrustPersonal")}</span>
            </div>
          </div>
        </div>

        {!hasUserFilters && popularDestinations.length > 0 && (
          <section className="popular-destinations">
            <div className="container">
              <h2 className="popular-destinations__title">{t("sPopularTitle")}</h2>
              <div className="popular-destinations__scroll">
                {popularDestinations.map((dest) => (
                  <button
                    key={dest.destination}
                    type="button"
                    className="dest-thumb"
                    onClick={() => {
                      setQuery(dest.destination);
                      updateParams({ q: dest.destination, page: 1 });
                    }}
                  >
                    <div
                      className="dest-thumb__img"
                      style={{ backgroundImage: `url(${dest.image})` }}
                    />
                    <div className="dest-thumb__label">
                      <strong>{dest.destination}</strong>
                      {isPlausibleTourPrice(dest.price) && <span>od {formatPrice(dest.price)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="search-results-section" ref={resultsSectionRef}>
          <div className="container search-results-layout">
            <aside className="search-sidebar">
              <div className="search-filter-block">
                <h2>{t("sFilterDestinations")}</h2>
                {destinationsState.status === "loading" && (
                  <div className="search-region-list search-region-list--loading" aria-busy="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="skeleton-line" style={{ height: 24, margin: "6px 0" }} />
                    ))}
                  </div>
                )}
                {destinationsState.status === "error" && (
                  <div role="alert" className="search-error" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span>{destinationsState.message}</span>
                    <button type="button" onClick={loadDestinations} style={{ alignSelf: "flex-start", textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}>
                      {t("sFilterRetry")}
                    </button>
                  </div>
                )}
                {destinationsState.status === "ready" && destinationsState.items.length === 0 && (
                  <p style={{ fontSize: ".875rem", color: "#64748b" }}>{t("sFilterNoDestinations")}</p>
                )}
                {destinationsState.status === "ready" && destinationsState.items.length > 0 && renderDestinationList()}
              </div>

              {result && (
                <div className="search-filter-block">
                  <h2>{t("sFilterPrice")}</h2>
                  <PriceRangeSlider
                    min={priceRange.min}
                    max={priceRange.max}
                    valueMin={priceMin}
                    valueMax={priceMax}
                    onChange={(min, max) => updateParams({ priceMin: min, priceMax: max, page: 1 })}
                  />
                </div>
              )}

              <div className="search-filter-block">
                <h2>{t("sFilterNights")}</h2>
                <select
                  className="filter-select"
                  value={activeNights}
                  onChange={(e) => updateParams({ nights: e.target.value, page: 1 })}
                >
                  {NIGHTS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="search-filter-block">
                <h2>{t("sFilterStars")}</h2>
                <div className="filter-btn-list">
                  {(["" , "3", "4", "5"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={activeStars === v ? "is-active" : ""}
                      onClick={() => updateParams({ stars: v, page: 1 })}
                    >
                      {v === "" ? t("sFilterAll") : "★".repeat(Number(v))}
                    </button>
                  ))}
                </div>
              </div>

              <div className="search-filter-block">
                <h2>{t("sFilterBoard")}</h2>
                <div className="filter-btn-list">
                  <button
                    type="button"
                    className={!activeBoard ? "is-active" : ""}
                    onClick={() => updateParams({ board: null, page: 1 })}
                  >{t("sFilterAll")}</button>
                  {BOARD_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={activeBoard === o.value ? "is-active" : ""}
                      onClick={() => updateParams({ board: o.value, page: 1 })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {favorites.length > 0 && (
                <div className="search-filter-block">
                  <h2>{t("sFilterSaved")}</h2>
                  <button
                    type="button"
                    className={`filter-btn-list__btn${showFavoritesOnly ? " is-active" : ""}`}
                    onClick={() => {
                      setShowFavoritesOnly((v) => {
                        const next = !v;
                        if (next) updateParams({ page: 1 });
                        return next;
                      });
                    }}
                  >
                    <Heart size={14} aria-hidden="true" />
                    {favorites.length} {t("sFilterSavedCount")}
                  </button>
                </div>
              )}

              <button className="search-reset" type="button" onClick={resetFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                {t("sFilterReset")}
              </button>

              <div className="sidebar-contact-cta">
                <p>{t("sSidebarContactPrompt")}</p>
                <a href="tel:+420721163860" className="sidebar-contact-phone">📞 +420 721 163 860</a>
                <a href="mailto:info@skytravel.cz" className="sidebar-contact-email">✉ info@skytravel.cz</a>
                <p className="sidebar-contact-note">{t("sSidebarContactNote")}</p>
              </div>
            </aside>

            <section className="search-results-main">
              <div className="search-results-toolbar">
                <div>
                  <h2>{totalText}</h2>
                  <p>{toolbarDescription}</p>
                  {result && result.filtered !== result.total && (
                    <p className="results-sub">
                      {t("sStateShown")} {displayedTours.length.toLocaleString("cs-CZ")} {t("sStateOf")} {result.total.toLocaleString("cs-CZ")} {t("sTotalSuffix")}
                    </p>
                  )}
                </div>
                <div className="search-sort-actions">
                  <button type="button" className={sortBy === "price" ? "is-active" : ""} onClick={() => toggleSort("price")}>
                    {t("sSortPrice")} {sortBy === "price" && <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                  <button type="button" className={sortBy === "date" ? "is-active" : ""} onClick={() => toggleSort("date")}>
                    {t("sSortDate")} {sortBy === "date" && <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                  <div className="view-toggle">
                    <button type="button" aria-label={t("sViewGrid")} className={viewMode === "grid" ? "is-active" : ""} onClick={() => setView("grid")}>
                      <LayoutGrid size={16} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label={t("sViewList")} className={viewMode === "list" ? "is-active" : ""} onClick={() => setView("list")}>
                      <LayoutList size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="search-share-btn"
                    onClick={handleShare}
                    aria-label={t("sShareLabel")}
                    title={t("sShareLabel")}
                  >
                    <Share2 size={16} aria-hidden="true" />
                  </button>
                  {shareConfirmation && (
                    <span
                      role="status"
                      aria-live="polite"
                      className={`search-share-pill search-share-pill--${shareConfirmation}`}
                    >
                      {shareConfirmation === "copied" ? t("sShareCopied") : t("sShareFailed")}
                    </span>
                  )}

                </div>
              </div>

              {error && <div className="search-error">{error}</div>}
              {resultsLoading && !result && (
                <div className="public-tour-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton-card">
                      <div className="skeleton-card__image" />
                      <div className="skeleton-card__body">
                        <div className="skeleton-line skeleton-line--short" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line skeleton-line--price" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!resultsLoading && !error && result?.items.length === 0 && (
                <div className="search-empty search-empty--results">
                  <div className="search-empty__icon">🔍</div>
                  <h3>{t("sNoResultsTitle")}</h3>
                  <p>{t("sNoResultsBody")}</p>
                  <ul className="search-empty__tips">
                    <li>
                      <button type="button" onClick={resetFilters}>{t("sNoResultsTipReset")}</button>
                    </li>
                    <li>{t("sNoResultsTipDates")}</li>
                    <li>{t("sNoResultsTipRegion")}</li>
                    <li>
                      {t("sNoResultsTipCallPre")} <a href="tel:+420721163860">{t("sNoResultsTipCallLink")}</a> {t("sNoResultsTipCallPost")}
                    </li>
                  </ul>
                </div>
              )}

              {activeChips.length > 0 && (
                <div className="active-chips">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className="active-chip"
                      onClick={chip.onClear}
                    >
                      {chip.label} ✕
                    </button>
                  ))}
                </div>
              )}

              {!hasUserFilters && (
                <div className="preset-pills">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="preset-pill"
                      onClick={() => updateParams({ ...preset.params, page: 1 })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              <div
                className={viewMode === "grid" ? "public-tour-grid" : "public-tour-list"}
                aria-busy={resultsLoading}
                style={resultsLoading && result ? { opacity: 0.6, pointerEvents: "none", position: "relative" } : undefined}
              >
                {(isMobile && !showFavoritesOnly ? applyLocalTourFilters(accumulatedItems, true) : displayedTours).map((tour) => {
                  const tourId = `${tour.source}-${tour.externalId}`;
                  return (
                    <PublicTourCard t={t}
                      key={tourId}
                      tour={tour}
                      viewMode={viewMode}
                      isFavorite={isFavorite(tourId)}
                      onToggleFavorite={() => toggleFavorite(tourId)}
                      onOpenDetail={() => openTourDetail(tour)}
                    />
                  );
                })}
              </div>
              {resultsLoading && result && (
                <p style={{ textAlign: "center", color: "#475569", marginTop: 12 }} aria-live="polite">
                  {t("sStateUpdating")}
                </p>
              )}

              {isMobile && !showFavoritesOnly && result && page < result.totalPages && (
                <div className="mobile-load-more">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => updateParams({ page: page + 1 })}
                    disabled={resultsLoading}
                  >
                    {resultsLoading ? t("sLoadingMore") : t("sLoadMore")}
                  </button>
                </div>
              )}

              {!isMobile && !showFavoritesOnly && result && result.totalPages > 1 && (
                <div className="search-pagination">
                  <button type="button" onClick={() => pageTo(page - 1)} disabled={page <= 1 || resultsLoading}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    {t("sPagePrev")}
                  </button>
                  <span>{t("sPageLabel")} {page} {t("sPageOf")} {result.totalPages}</span>
                  <button type="button" onClick={() => pageTo(page + 1)} disabled={page >= result.totalPages || resultsLoading}>
                    {t("sPageNext")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
              {!isMobile && !showFavoritesOnly && result && result.totalPages > 1 && result.totalPages <= 10 && (
                <div className="pagination-pills">
                  {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={p === page ? "is-active" : ""}
                      onClick={() => pageTo(p)}
                      disabled={resultsLoading}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        <div className="mobile-filter-fab mobile-only">
          <button type="button" onClick={() => setMobileFiltersOpen(true)}>
            {t("sFilterFab")}
            {[activeDestinationSlug, activeTransport, activeNights, activeStars, activeBoard].filter(Boolean).length > 0 && (
              <span className="mobile-filter-fab__count">
                {[activeDestinationSlug, activeTransport, activeNights, activeStars, activeBoard].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </main>

      {mobileFiltersOpen && (
        <>
          <div className="mobile-filter-drawer" role="dialog" aria-modal="true" aria-label={t("sDrawerTitle")}>
            <div className="mobile-filter-drawer__header">
              <h2>{t("sDrawerTitle")}</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label={t("sDrawerClose")}>✕</button>
            </div>
            <div className="mobile-filter-drawer__body">
              <div className="search-filter-block">
                <h2>{t("sFilterDestinations")}</h2>
                {destinationsState.status === "loading" && (
                  <div className="search-region-list search-region-list--loading" aria-busy="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="skeleton-line" style={{ height: 24, margin: "6px 0" }} />
                    ))}
                  </div>
                )}
                {destinationsState.status === "error" && (
                  <div role="alert" className="search-error" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span>{destinationsState.message}</span>
                    <button type="button" onClick={loadDestinations} style={{ alignSelf: "flex-start", textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}>
                      {t("sFilterRetry")}
                    </button>
                  </div>
                )}
                {destinationsState.status === "ready" && destinationsState.items.length === 0 && (
                  <p style={{ fontSize: ".875rem", color: "#64748b" }}>{t("sFilterNoDestinations")}</p>
                )}
                {destinationsState.status === "ready" && destinationsState.items.length > 0 && renderDestinationList()}
              </div>
              {result && (
                <div className="search-filter-block">
                  <h2>{t("sFilterPrice")}</h2>
                  <PriceRangeSlider min={naturalPriceRange.min} max={naturalPriceRange.max} valueMin={priceMin} valueMax={priceMax} onChange={(min, max) => updateParams({ priceMin: min, priceMax: max, page: 1 })} />
                </div>
              )}
              <div className="search-filter-block">
                <h2>{t("sFilterNights")}</h2>
                <select className="filter-select" value={activeNights} onChange={(e) => updateParams({ nights: e.target.value, page: 1 })}>
                  {NIGHTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="search-filter-block">
                <h2>{t("sFilterStars")}</h2>
                <div className="filter-btn-list">
                  {(["", "3", "4", "5"] as const).map((v) => (
                    <button key={v} type="button" className={activeStars === v ? "is-active" : ""} onClick={() => updateParams({ stars: v, page: 1 })}>
                      {v === "" ? t("sFilterAll") : "★".repeat(Number(v))}
                    </button>
                  ))}
                </div>
              </div>
              <div className="search-filter-block">
                <h2>{t("sFilterBoard")}</h2>
                <div className="filter-btn-list">
                  <button type="button" className={!activeBoard ? "is-active" : ""} onClick={() => updateParams({ board: null, page: 1 })}>{t("sFilterAll")}</button>
                  {BOARD_OPTIONS.map((o) => (
                    <button key={o.value} type="button" className={activeBoard === o.value ? "is-active" : ""} onClick={() => updateParams({ board: o.value, page: 1 })}>{o.label}</button>
                  ))}
                </div>
              </div>
              {favorites.length > 0 && (
                <div className="search-filter-block">
                  <h2>{t("sFilterSaved")}</h2>
                  <button type="button" className={`filter-btn-list__btn${showFavoritesOnly ? " is-active" : ""}`} onClick={() => {
                    setShowFavoritesOnly((v) => {
                      const next = !v;
                      if (next) updateParams({ page: 1 });
                      return next;
                    });
                  }}>
                    <Heart size={14} aria-hidden="true" />
                    {favorites.length} {t("sFilterSavedCount")}
                  </button>
                </div>
              )}
              <button className="search-reset" type="button" onClick={() => { resetFilters(); setMobileFiltersOpen(false); }}>
                <RotateCcw size={16} aria-hidden="true" />
                {t("sFilterReset")}
              </button>
            </div>
            <div className="mobile-filter-drawer__footer">
              <button type="button" className="btn-primary" onClick={() => setMobileFiltersOpen(false)}>
                {t("sDrawerApplyPrefix")} {result?.filtered != null ? result.filtered.toLocaleString("cs-CZ") : ""} {t("sStickyOffers")}
              </button>
            </div>
          </div>
          <div className="mobile-filter-backdrop" onClick={() => setMobileFiltersOpen(false)} />
        </>
      )}

      <LeadPopup {...leadPopup} prefilledQuery={activeQuery || undefined} prefilledDateStart={activeDateStart || undefined} />
      {detailTour && (
        <TourDetailModal
          tour={detailTour}
          providerLabel={providerLabels[detailTour.source] ?? detailTour.source}
          offers={detailTour.offerGroupKey && offerGroupItems[detailTour.offerGroupKey] ? offerGroupItems[detailTour.offerGroupKey] : [detailTour]}
          loading={detailTour.offerGroupKey ? Boolean(offerGroupLoading[detailTour.offerGroupKey]) : false}
          error={detailTour.offerGroupKey ? offerGroupErrors[detailTour.offerGroupKey] : undefined}
          onClose={() => setDetailTour(null)}
        />
      )}
    </div>
  );
}

function PublicTourCard({
  t,
  tour,
  viewMode,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
}: {
  t: (key: TranslationKey) => string;
  tour: UnifiedTour;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
}) {
  function stopCardAction(event: React.MouseEvent, action: () => void) {
    event.stopPropagation();
    action();
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenDetail();
  }

  const imageSrc = tour.image || getTourFallbackImage(tour.destination);
  const srcSet = buildSrcSet(imageSrc);

  const imageEl = (
    <div className="public-tour-card__image">
      <img
        src={imageSrc}
        srcSet={srcSet}
        sizes={srcSet ? "(max-width: 768px) 100vw, 33vw" : undefined}
        alt={tour.title}
        loading="lazy"
        decoding="async"
        width={640}
        height={400}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
        }}
      />
      <button
        type="button"
        className={`card-heart${isFavorite ? " is-saved" : ""}`}
        aria-label={isFavorite ? t("sCardUnsave") : t("sCardSave")}
        onClick={(event) => stopCardAction(event, onToggleFavorite)}
      >
        <Heart size={16} aria-hidden="true" />
      </button>
    </div>
  );

  const bodyEl = (
    <div className="public-tour-card__body">
      <h3>{tour.title}</h3>
      <p>{tour.destination}</p>
      <div className="public-tour-card__footer">
        <strong>{isPlausibleTourPrice(tour.price) ? `${t("from")} ${formatPrice(tour.price)}` : t("sPriceOnRequest")}</strong>
        <button type="button" className="btn-detail" onClick={(event) => stopCardAction(event, onOpenDetail)}>
          <Search size={16} aria-hidden="true" />
          {t("sCardDetail")}
        </button>
      </div>
    </div>
  );

  if (viewMode === "list") {
    return (
      <article className="public-tour-list-item" role="button" tabIndex={0} onClick={onOpenDetail} onKeyDown={handleCardKeyDown}>
        {imageEl}
        {bodyEl}
        <button type="button" className="btn-detail btn-detail--list" onClick={(event) => stopCardAction(event, onOpenDetail)}>
          <Search size={16} aria-hidden="true" />
          {t("sCardDetail")}
        </button>
      </article>
    );
  }

  return (
    <article className="public-tour-card" role="button" tabIndex={0} onClick={onOpenDetail} onKeyDown={handleCardKeyDown}>
      {imageEl}
      {bodyEl}
    </article>
  );
}
