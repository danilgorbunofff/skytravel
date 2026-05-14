import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Heart, LayoutGrid, LayoutList, MapPin, Plane, RotateCcw, Search } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { useLeadPopup } from "../hooks/useLeadPopup";
import LeadPopup from "../components/LeadPopup";
import {
  fetchPublicAllProviderTours,
  fetchPublicDestinations,
  fetchPublicProviderOfferGroup,
} from "../api/publicProviders";
import { createInquiry } from "../api";
import { loadBootstrap } from "../api/bootstrapCache";
import type { ProviderMeta, PublicDestinationSummary, ToursResult, UnifiedFilters, UnifiedTour } from "../types/providers";
import { useLanguage } from "../hooks/useLanguage";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import { PriceRangeSlider } from "../components/PriceRangeSlider";
import "../site.css";

const TRANSPORT_OPTIONS = [
  { value: "plane", label: "Letecky" },
  { value: "bus", label: "Autobusem" },
  { value: "car", label: "Vlastní" },
];

const NIGHTS_OPTIONS = [
  { value: "",      label: "Libovolná délka" },
  { value: "1-6",   label: "do 6 nocí" },
  { value: "7-9",   label: "7–9 nocí" },
  { value: "10-13", label: "10–13 nocí" },
  { value: "14-99", label: "14 a více nocí" },
];

const BOARD_OPTIONS = [
  { value: "AI",  label: "All Inclusive" },
  { value: "UAI", label: "Ultra AI" },
  { value: "FB",  label: "Plná penze" },
  { value: "HB",  label: "Polopenze" },
  { value: "BB",  label: "Snídaně" },
  { value: "RO",  label: "Bez stravy" },
];

const PRESETS = [
  { label: "⚡ Last Minute",   params: { dateStart: new Date().toISOString().slice(0, 10), dateEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) } },
  { label: "🍽 All Inclusive", params: { board: "AI" } },
  { label: "👨\u200d👩\u200d👧 Rodina",      params: { board: "AI", nights: "7-13" } },
  { label: "✈ Krátký výlet",  params: { nights: "1-6" } },
] as const;

const transportLabel: Record<string, string> = {
  plane: "Letecky",
  bus: "Autobusem",
  train: "Vlakem",
  car: "Vlastní",
  boat: "Lodí",
};

const boardLabel: Record<string, string> = {
  AI: "All Inclusive",
  UAI: "Ultra AI",
  FB: "Plná penze",
  HB: "Polopenze",
  BB: "Snídaně",
  RO: "Bez stravy",
  SC: "Bez stravy",
};

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

function getTourFallbackImage(destination: string): string {
  const normalizedDestination = normalizeFallbackText(destination);
  const alias = Object.entries(fallbackDestinationAliases).find(([key]) => normalizedDestination.includes(key))?.[1];
  const match = popularDestinations.find((item) => {
    const normalizedFavorite = normalizeFallbackText(item.destination);
    return normalizedDestination.includes(normalizedFavorite) || (alias != null && normalizedFavorite.includes(alias));
  });
  return match?.image ?? "/placeholder-tour.svg";
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

function fmtDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("cs-CZ");
}

function starsDisplay(value: string | undefined): string {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) return "";
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

function getParamNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default function SearchPage() {
  const { lang, setLang, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [destinations, setDestinations] = useState<PublicDestinationSummary[]>([]);
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
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const leadPopup = useLeadPopup();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [heroExpanded, setHeroExpanded] = useState(() => !searchParams.get("q"));
  const [pastHero, setPastHero] = useState(false);

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
  const hasPriceFilter = Boolean(searchParams.get("priceMin") || searchParams.get("priceMax"));
  const hasActiveSearch = Boolean(
    activeQuery || activeDateStart || activeDateEnd || activeTransport || activeDestinationSlug || activeNights || activeStars || activeBoard || hasPriceFilter,
  );

  const priceRange = useMemo(() => {
    if (!result?.items.length) return { min: 0, max: 200000 };
    const prices = result.items.map((t) => t.price);
    return {
      min: Math.floor(Math.min(...prices) / 500) * 500,
      max: Math.ceil(Math.max(...prices) / 500) * 500,
    };
  }, [result]);

  const priceMin = Number(searchParams.get("priceMin")) || priceRange.min;
  const priceMax = Number(searchParams.get("priceMax")) || priceRange.max;

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

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: Record<string, null> }[] = [];
    if (activeQuery) chips.push({ label: `"${activeQuery}"`, clear: { q: null } });
    if (activeDateStart) chips.push({ label: `Od ${fmtDate(activeDateStart)}`, clear: { dateStart: null } });
    if (activeDateEnd) chips.push({ label: `Do ${fmtDate(activeDateEnd)}`, clear: { dateEnd: null } });
    if (activeTransport) chips.push({ label: transportLabel[activeTransport] ?? activeTransport, clear: { transport: null } });
    if (activeDestinationSlug) {
      const destination = destinations.find((item) => item.slug === activeDestinationSlug);
      chips.push({ label: destination?.czechName ?? activeDestinationSlug, clear: { destinationSlug: null } });
    }
    if (activeNights) {
      const opt = NIGHTS_OPTIONS.find((o) => o.value === activeNights);
      chips.push({ label: opt?.label ?? activeNights, clear: { nights: null } });
    }
    if (activeStars) chips.push({ label: `★${activeStars}+`, clear: { stars: null } });
    if (activeBoard) {
      const opt = BOARD_OPTIONS.find((o) => o.value === activeBoard);
      chips.push({ label: opt?.label ?? activeBoard, clear: { board: null } });
    }
    if (searchParams.get("priceMin") || searchParams.get("priceMax")) {
      chips.push({
        label: `Cena: ${(Number(searchParams.get("priceMin")) || priceRange.min).toLocaleString("cs-CZ")} – ${(Number(searchParams.get("priceMax")) || priceRange.max).toLocaleString("cs-CZ")} Kč`,
        clear: { priceMin: null, priceMax: null },
      });
    }
    return chips;
  }, [activeQuery, activeDateStart, activeDateEnd, activeTransport, activeDestinationSlug, activeNights, activeStars, activeBoard, searchParams, priceRange, destinations]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    fetchPublicDestinations()
      .then((items) => {
        if (!cancelled) setDestinations(items.filter((item) => item.count > 0));
      })
      .catch(() => {
        if (!cancelled) setDestinations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
  useEffect(() => {
    if (!hasActiveSearch) {
      setResult(null);
      setError(null);
      setResultsLoading(false);
      return;
    }
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
    }, [searchFilterKey, hasActiveSearch]);

  const openTourDetail = useCallback((tour: UnifiedTour) => {
    const key = tour.offerGroupKey;
    setDetailTour(tour);
    if (!key || (tour.offersCount ?? 0) <= 1 || offerGroupItems[key] || offerGroupLoading[key]) return;

    setOfferGroupLoading((prev) => ({ ...prev, [key]: true }));
    setOfferGroupErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    fetchPublicProviderOfferGroup(tour.source, key, buildFilters({ includePaging: false }))
      .then((items) => {
        setOfferGroupItems((prev) => ({
          ...prev,
          [key]: items,
        }));
      })
      .catch((err) => {
        setOfferGroupErrors((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Termíny se nepodařilo načíst.",
        }));
      })
      .finally(() => {
        setOfferGroupLoading((prev) => ({ ...prev, [key]: false }));
      });
  }, [buildFilters, offerGroupItems, offerGroupLoading]);

  function updateParams(patch: Record<string, string | number | null | undefined>, replace = false) {
    setValidationError(null);
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    setSearchParams(next, { replace });
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (dateStart && dateEnd && dateStart > dateEnd) {
      setValidationError("Datum odjezdu nesmí být po datu návratu.");
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
  }

  function toggleSort(nextSortBy: "price" | "date") {
    const nextSortDir = sortBy === nextSortBy && sortDir === "asc" ? "desc" : "asc";
    updateParams({ sortBy: nextSortBy, sortDir: nextSortDir, page: 1 });
  }

  function pageTo(nextPage: number) {
    if (nextPage < 1 || nextPage > (result?.totalPages || 1)) return;
    updateParams({ page: nextPage });
    window.setTimeout(() => {
      document.querySelector(".search-results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const visibleFrom = result && result.filtered > 0 ? (result.page - 1) * result.limit + 1 : 0;
  const visibleTo = result ? Math.min(result.page * result.limit, result.filtered) : 0;
  const totalText = result
    ? `Zobrazeno ${visibleFrom.toLocaleString("cs-CZ")}–${visibleTo.toLocaleString("cs-CZ")} z ${result.filtered.toLocaleString("cs-CZ")} hotelů${result.rawFilteredOffers && result.rawFilteredOffers > result.filtered ? ` (${result.rawFilteredOffers.toLocaleString("cs-CZ")} termínů)` : ""}`
    : resultsLoading
      ? "Hledám zájezdy…"
      : hasActiveSearch
        ? "Žádné nabídky"
        : "Zadejte destinaci a spusťte vyhledávání";

  return (
    <div>
      <div className={`sticky-search-bar${pastHero ? " is-visible" : ""}`}>
        <div className="container sticky-search-bar__inner">
          <span className="sticky-search-bar__query">
            {activeQuery || "Vyhledávání"}{activeDateStart && ` · ${fmtDate(activeDateStart)}`}
          </span>
          <button
            type="button"
            className="sticky-search-bar__edit"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Upravit ✎
          </button>
          {result && (
            <span className="sticky-search-bar__count">
              {result.filtered.toLocaleString("cs-CZ")} nabídek
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
            <button type="submit" aria-label="Vyhledat">GO</button>
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
              <h1>Najděte zájezd podle sebe</h1>
              <p>Vyhledávání pracuje s aktuálně synchronizovanými nabídkami partnerských cestovních kanceláří.</p>
            </div>

            <form className="public-search-panel" onSubmit={submitSearch}>
              <label>
                <span>Kam pojedeme</span>
                <div className="public-search-input">
                  <MapPin size={18} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setValidationError(null);
                      setQuery(event.target.value);
                    }}
                    placeholder="Místo nebo hotel"
                  />
                </div>
              </label>
              <div className={`search-panel-extra${heroExpanded ? " is-open" : ""}`}>
              <label>
                <span>Odjezd od</span>
                <div className="public-search-input">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input
                    type="date"
                    max={dateEnd || undefined}
                    value={dateStart}
                    onChange={(event) => {
                      setDateStart(event.target.value);
                      setValidationError(null);
                    }}
                  />
                </div>
              </label>
              <label>
                <span>Návrat do</span>
                <div className="public-search-input">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input
                    type="date"
                    min={dateStart || undefined}
                    value={dateEnd}
                    onChange={(event) => {
                      setDateEnd(event.target.value);
                      setValidationError(null);
                    }}
                  />
                </div>
              </label>
              <label>
                <span>Doprava</span>
                <div className="public-search-input">
                  <Plane size={18} aria-hidden="true" />
                  <select
                    value={transport}
                    onChange={(event) => {
                      setValidationError(null);
                      setTransport(event.target.value);
                    }}
                  >
                    <option value="">Nerozhoduje</option>
                    {TRANSPORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                <span>Cestující</span>
                <div className="public-search-input guests-picker">
                  <div className="guests-stepper">
                    <div className="guests-stepper__row">
                      <span>Dospělí</span>
                      <div className="stepper">
                        <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))}>−</button>
                        <span>{adults}</span>
                        <button type="button" onClick={() => setAdults((a) => Math.min(9, a + 1))}>+</button>
                      </div>
                    </div>
                    <div className="guests-stepper__row">
                      <span>Děti</span>
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
                {heroExpanded ? "Méně možností ▲" : "Termín a doprava ▼"}
              </button>
              <button className="public-search-submit" type="submit">
                <Search size={18} aria-hidden="true" />
                Vyhledat
              </button>
            </form>
            {validationError && <p className="search-validation">{validationError}</p>}
          </div>
        </section>

        <div className="trust-bar">
          <div className="container trust-bar__inner">
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>Ověřený partner cestovních kanceláří</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>Pojištění vkladu zákazníka</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>Bez poplatků za poptávku</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span>Osobní přístup &amp; okamžitá odezva</span>
            </div>
          </div>
        </div>

        {!hasActiveSearch && popularDestinations.length > 0 && (
          <section className="popular-destinations">
            <div className="container">
              <h2 className="popular-destinations__title">Oblíbené destinace</h2>
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
                      {dest.price && <span>od {formatPrice(dest.price)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="search-results-section">
          <div className="container search-results-layout">
            <aside className="search-sidebar">
              <div className="search-filter-block">
                <h2>Destinace</h2>
                <div className="search-region-list">
                  <button
                    type="button"
                    className={!activeDestinationSlug ? "is-active" : ""}
                    onClick={() => updateParams({ destinationSlug: null, page: 1 })}
                  >
                    Všechny destinace
                  </button>
                  {destinations.map((destination) => (
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
                </div>
              </div>

              {result && (
                <div className="search-filter-block">
                  <h2>Cena</h2>
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
                <h2>Délka pobytu</h2>
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
                <h2>Hodnocení hotelu</h2>
                <div className="filter-btn-list">
                  {(["" , "3", "4", "5"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={activeStars === v ? "is-active" : ""}
                      onClick={() => updateParams({ stars: v, page: 1 })}
                    >
                      {v === "" ? "Vše" : "★".repeat(Number(v))}
                    </button>
                  ))}
                </div>
              </div>

              <div className="search-filter-block">
                <h2>Strava</h2>
                <div className="filter-btn-list">
                  <button
                    type="button"
                    className={!activeBoard ? "is-active" : ""}
                    onClick={() => updateParams({ board: null, page: 1 })}
                  >Vše</button>
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
                  <h2>Uložené</h2>
                  <button
                    type="button"
                    className={`filter-btn-list__btn${showFavoritesOnly ? " is-active" : ""}`}
                    onClick={() => setShowFavoritesOnly((v) => !v)}
                  >
                    <Heart size={14} aria-hidden="true" />
                    {favorites.length} uložených
                  </button>
                </div>
              )}

              <button className="search-reset" type="button" onClick={resetFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                Reset filtrů
              </button>

              <div className="sidebar-contact-cta">
                <p>Nenašli jste co hledáte?</p>
                <a href="tel:+420721163860" className="sidebar-contact-phone">📞 +420 721 163 860</a>
                <a href="mailto:info@skytravel.cz" className="sidebar-contact-email">✉ info@skytravel.cz</a>
                <p className="sidebar-contact-note">Poradíme vám osobně — zdarma.</p>
              </div>
            </aside>

            <section className="search-results-main">
              <div className="search-results-toolbar">
                <div>
                  <h2>{totalText}</h2>
                  <p>Všichni partneři</p>
                  {result && result.filtered !== result.total && (
                    <p className="results-sub">
                      Zobrazeno {displayedTours.length.toLocaleString("cs-CZ")} z {result.total.toLocaleString("cs-CZ")} celkem
                    </p>
                  )}
                </div>
                <div className="search-sort-actions">
                  <button type="button" className={sortBy === "price" ? "is-active" : ""} onClick={() => toggleSort("price")}>
                    Cena {sortBy === "price" && <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                  <button type="button" className={sortBy === "date" ? "is-active" : ""} onClick={() => toggleSort("date")}>
                    Datum {sortBy === "date" && <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                  <div className="view-toggle">
                    <button type="button" aria-label="Mřížka" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setView("grid")}>
                      <LayoutGrid size={16} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Seznam" className={viewMode === "list" ? "is-active" : ""} onClick={() => setView("list")}>
                      <LayoutList size={16} aria-hidden="true" />
                    </button>
                  </div>

                </div>
              </div>

              {error && <div className="search-error">{error}</div>}
              {resultsLoading && (
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
              {!resultsLoading && !error && !hasActiveSearch && (
                <div className="search-empty">
                  <h3>Začněte vyhledáváním</h3>
                  <p>Zadejte destinaci, termín nebo vyberte oblast a potom spusťte vyhledávání.</p>
                </div>
              )}
              {!resultsLoading && !error && result?.items.length === 0 && (
                <div className="search-empty search-empty--results">
                  <div className="search-empty__icon">🔍</div>
                  <h3>Žádné nabídky nenalezeny</h3>
                  <p>Pro zadané filtry jsme nic nenašli. Zkuste:</p>
                  <ul className="search-empty__tips">
                    <li>
                      <button type="button" onClick={resetFilters}>Zrušit všechny filtry</button>
                    </li>
                    <li>Rozšířit datum odjezdu o ±1–2 týdny</li>
                    <li>Vybrat jiný cílový region v záložce Oblast</li>
                    <li>
                      Nebo nás <a href="tel:+420721163860">zavolejte</a> — poradíme osobně
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
                      onClick={() => updateParams({ ...chip.clear, page: 1 })}
                    >
                      {chip.label} ✕
                    </button>
                  ))}
                </div>
              )}

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

              <div className={viewMode === "grid" ? "public-tour-grid" : "public-tour-list"}>
                {displayedTours.map((tour) => {
                  const tourId = `${tour.source}-${tour.externalId}`;
                  return (
                    <PublicTourCard
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

              {result && result.totalPages > 1 && (
                <div className="search-pagination">
                  <button type="button" onClick={() => pageTo(page - 1)} disabled={page <= 1}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Předchozí
                  </button>
                  <span>Strana {page} z {result.totalPages}</span>
                  <button type="button" onClick={() => pageTo(page + 1)} disabled={page >= result.totalPages}>
                    Další
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
              {result && result.totalPages > 1 && result.totalPages <= 10 && (
                <div className="pagination-pills">
                  {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={p === page ? "is-active" : ""}
                      onClick={() => pageTo(p)}
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
            ⚙ Filtrovat
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
          <div className="mobile-filter-drawer" role="dialog" aria-modal="true" aria-label="Filtry">
            <div className="mobile-filter-drawer__header">
              <h2>Filtry</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Zavřít">✕</button>
            </div>
            <div className="mobile-filter-drawer__body">
              <div className="search-filter-block">
                <h2>Destinace</h2>
                <div className="search-region-list">
                  <button type="button" className={!activeDestinationSlug ? "is-active" : ""} onClick={() => updateParams({ destinationSlug: null, page: 1 })}>Všechny destinace</button>
                  {destinations.map((destination) => (
                    <button key={destination.slug} type="button" className={activeDestinationSlug === destination.slug ? "is-active" : ""} onClick={() => updateParams({ destinationSlug: destination.slug, q: null, page: 1 })}>
                      {destination.czechName}
                      {destination.count > 0 && <span className="region-count">({destination.count})</span>}
                    </button>
                  ))}
                </div>
              </div>
              {result && (
                <div className="search-filter-block">
                  <h2>Cena</h2>
                  <PriceRangeSlider min={priceRange.min} max={priceRange.max} valueMin={priceMin} valueMax={priceMax} onChange={(min, max) => updateParams({ priceMin: min, priceMax: max, page: 1 })} />
                </div>
              )}
              <div className="search-filter-block">
                <h2>Délka pobytu</h2>
                <select className="filter-select" value={activeNights} onChange={(e) => updateParams({ nights: e.target.value, page: 1 })}>
                  {NIGHTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="search-filter-block">
                <h2>Hodnocení hotelu</h2>
                <div className="filter-btn-list">
                  {(["", "3", "4", "5"] as const).map((v) => (
                    <button key={v} type="button" className={activeStars === v ? "is-active" : ""} onClick={() => updateParams({ stars: v, page: 1 })}>
                      {v === "" ? "Vše" : "★".repeat(Number(v))}
                    </button>
                  ))}
                </div>
              </div>
              <div className="search-filter-block">
                <h2>Strava</h2>
                <div className="filter-btn-list">
                  <button type="button" className={!activeBoard ? "is-active" : ""} onClick={() => updateParams({ board: null, page: 1 })}>Vše</button>
                  {BOARD_OPTIONS.map((o) => (
                    <button key={o.value} type="button" className={activeBoard === o.value ? "is-active" : ""} onClick={() => updateParams({ board: o.value, page: 1 })}>{o.label}</button>
                  ))}
                </div>
              </div>
              {favorites.length > 0 && (
                <div className="search-filter-block">
                  <h2>Uložené</h2>
                  <button type="button" className={`filter-btn-list__btn${showFavoritesOnly ? " is-active" : ""}`} onClick={() => setShowFavoritesOnly((v) => !v)}>
                    <Heart size={14} aria-hidden="true" />
                    {favorites.length} uložených
                  </button>
                </div>
              )}
              <button className="search-reset" type="button" onClick={() => { resetFilters(); setMobileFiltersOpen(false); }}>
                <RotateCcw size={16} aria-hidden="true" />
                Reset filtrů
              </button>
            </div>
            <div className="mobile-filter-drawer__footer">
              <button type="button" className="btn-primary" onClick={() => setMobileFiltersOpen(false)}>
                Zobrazit {result?.filtered != null ? result.filtered.toLocaleString("cs-CZ") : ""} nabídek
              </button>
            </div>
          </div>
          <div className="mobile-filter-backdrop" onClick={() => setMobileFiltersOpen(false)} />
        </>
      )}

      <LeadPopup {...leadPopup} prefilledQuery={activeQuery || undefined} prefilledDateStart={activeDateStart || undefined} />
      {detailTour && (
        <ProviderTourModal
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
  tour,
  viewMode,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
}: {
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

  const imageEl = (
    <div className="public-tour-card__image">
      <img
        src={tour.image || getTourFallbackImage(tour.destination)}
        alt={tour.title}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
        }}
      />
      <button
        type="button"
        className={`card-heart${isFavorite ? " is-saved" : ""}`}
        aria-label={isFavorite ? "Odebrat ze záložek" : "Přidat do záložek"}
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
        <strong>od {formatPrice(tour.price)}</strong>
        <button type="button" className="btn-detail" onClick={(event) => stopCardAction(event, onOpenDetail)}>
          <Search size={16} aria-hidden="true" />
          Detail
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
          Detail
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

function ProviderTourModal({
  tour,
  providerLabel,
  offers,
  loading,
  error,
  onClose,
}: {
  tour: UnifiedTour;
  providerLabel: string;
  offers: UnifiedTour[];
  loading: boolean;
  error?: string;
  onClose: () => void;
}) {
  const [selectedOfferId, setSelectedOfferId] = useState(`${tour.source}-${tour.externalId}`);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryConsent, setInquiryConsent] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inquiryError, setInquiryError] = useState("");

  useEffect(() => {
    setSelectedOfferId(`${tour.source}-${tour.externalId}`);
    setPhotoIndex(0);
    setInquiryStatus("idle");
    setInquiryError("");
  }, [tour]);

  const sortedOffers = useMemo(
    () => [...offers].sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime() || left.price - right.price),
    [offers],
  );
  const selectedOffer = sortedOffers.find((offer) => `${offer.source}-${offer.externalId}` === selectedOfferId) ?? sortedOffers[0] ?? tour;
  const photos = selectedOffer.photos?.length
    ? selectedOffer.photos
    : [selectedOffer.image || getTourFallbackImage(selectedOffer.destination)];
  const nights = selectedOffer.nights ?? Math.round(
    (new Date(selectedOffer.endDate).getTime() - new Date(selectedOffer.startDate).getTime()) / 86_400_000,
  );
  const stars = starsDisplay(selectedOffer.stars);
  const hasMultiplePhotos = photos.length > 1;

  function showPreviousPhoto() {
    if (!hasMultiplePhotos) return;
    setPhotoIndex((current) => (current - 1 + photos.length) % photos.length);
  }

  function showNextPhoto() {
    if (!hasMultiplePhotos) return;
    setPhotoIndex((current) => (current + 1) % photos.length);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") showPreviousPhoto();
      if (event.key === "ArrowRight") showNextPhoto();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultiplePhotos, onClose, photos.length]);

  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInquiryError("");
    if (!inquiryConsent) {
      setInquiryError("Potvrďte prosím souhlas se zpracováním údajů.");
      return;
    }
    setInquiryStatus("sending");
    try {
      await createInquiry({
        email: inquiryEmail,
        destination: `${providerLabel}: ${selectedOffer.title}, ${selectedOffer.destination}, ${fmtDate(selectedOffer.startDate)} - ${fmtDate(selectedOffer.endDate)}, ${formatPrice(selectedOffer.price)}`,
        gdprConsent: true,
        source: "provider-tour-modal",
      });
      setInquiryStatus("sent");
    } catch {
      setInquiryStatus("error");
      setInquiryError("Poptávku se nepodařilo odeslat. Zkontrolujte e-mail a zkuste to znovu.");
    }
  }

  return (
    <div className="provider-tour-modal" role="dialog" aria-modal="true" aria-label={selectedOffer.title}>
      <div className="provider-tour-modal__backdrop" onClick={onClose} />
      <div className="provider-tour-modal__content">
        <button type="button" className="provider-tour-modal__close" onClick={onClose} aria-label="Zavřít">✕</button>
        <div className="provider-tour-modal__media">
          {photos.map((photo, index) => (
            <img
              key={`${photo}-${index}`}
              className={index === photoIndex ? "is-active" : ""}
              src={photo}
              alt=""
              loading="lazy"
              onError={(event) => { (event.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg"; }}
            />
          ))}
          {hasMultiplePhotos && (
            <>
              <button type="button" className="provider-tour-modal__photo-nav provider-tour-modal__photo-nav--prev" onClick={showPreviousPhoto} aria-label="Předchozí fotka">
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className="provider-tour-modal__photo-nav provider-tour-modal__photo-nav--next" onClick={showNextPhoto} aria-label="Další fotka">
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
          {hasMultiplePhotos && (
            <div className="provider-tour-modal__dots">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={index === photoIndex ? "is-active" : ""}
                  aria-label={`Fotka ${index + 1}`}
                  onClick={() => setPhotoIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="provider-tour-modal__body">
          <div className="provider-tour-modal__heading">
            <span>{providerLabel}</span>
            <h2>{selectedOffer.title}</h2>
            <p>{selectedOffer.destination}</p>
          </div>

          <div className="provider-tour-modal__facts">
            <div><span>Termín</span><strong>{fmtDate(selectedOffer.startDate)} – {fmtDate(selectedOffer.endDate)}</strong></div>
            <div><span>Délka</span><strong>{Number.isFinite(nights) && nights > 0 ? `${nights} nocí` : "Dle nabídky"}</strong></div>
            <div><span>Doprava</span><strong>{transportLabel[selectedOffer.transport] ?? (selectedOffer.transport || "Dle nabídky")}</strong></div>
            <div><span>Strava</span><strong>{boardLabel[selectedOffer.board] ?? (selectedOffer.board || "Dle nabídky")}</strong></div>
            {stars && <div><span>Hotel</span><strong>{stars}</strong></div>}
            {selectedOffer.roomType && <div><span>Pokoj</span><strong>{selectedOffer.roomType}</strong></div>}
            <div className="provider-tour-modal__price"><span>Cena od</span><strong>{formatPrice(selectedOffer.price)}</strong></div>
          </div>

          {selectedOffer.description && (
            <p className="provider-tour-modal__description">{selectedOffer.description}</p>
          )}

          <section className="provider-tour-modal__offers" aria-live="polite">
            <h3>Dostupné termíny</h3>
            {loading ? (
              <p>Načítám termíny…</p>
            ) : error ? (
              <p>{error}</p>
            ) : sortedOffers.length > 0 ? (
              <label className="provider-tour-modal__date-select">
                <span className="provider-tour-modal__field-label">Vyberte termín</span>
                <select value={`${selectedOffer.source}-${selectedOffer.externalId}`} onChange={(event) => setSelectedOfferId(event.target.value)}>
                  {sortedOffers.map((offer) => {
                    const offerId = `${offer.source}-${offer.externalId}`;
                    const offerNights = offer.nights ?? Math.round(
                      (new Date(offer.endDate).getTime() - new Date(offer.startDate).getTime()) / 86_400_000,
                    );
                    return (
                      <option key={offerId} value={offerId}>
                        {fmtDate(offer.startDate)} - {fmtDate(offer.endDate)} · {Number.isFinite(offerNights) && offerNights > 0 ? `${offerNights} nocí` : "délka dle nabídky"} · {formatPrice(offer.price)}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : (
              <p>Žádné termíny pro zadané filtry.</p>
            )}
          </section>

          <form className="provider-tour-modal__inquiry" onSubmit={submitInquiry}>
            <label>
              <span className="provider-tour-modal__field-label">E-mail pro poptávku</span>
              <input
                type="email"
                value={inquiryEmail}
                onChange={(event) => setInquiryEmail(event.target.value)}
                placeholder="vas@email.cz"
                required
              />
            </label>
            <label className="provider-tour-modal__consent">
              <input
                type="checkbox"
                checked={inquiryConsent}
                onChange={(event) => setInquiryConsent(event.target.checked)}
                required
              />
              <span className="provider-tour-modal__consent-text">
                Souhlasím se zpracováním údajů podle <Link to="/gdpr">GDPR</Link>.
              </span>
            </label>
            {inquiryError && <p className="provider-tour-modal__form-error">{inquiryError}</p>}
            {inquiryStatus === "sent" && <p className="provider-tour-modal__form-success">Poptávka byla odeslána. Ozveme se vám co nejdříve.</p>}
            <button type="submit" disabled={inquiryStatus === "sending"}>
              {inquiryStatus === "sending" ? "Odesílám…" : "Poptat zájezd"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}