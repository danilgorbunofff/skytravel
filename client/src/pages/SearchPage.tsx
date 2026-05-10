import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Heart, LayoutGrid, LayoutList, MapPin, Plane, RotateCcw, Search, Share2 } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { useLeadPopup } from "../hooks/useLeadPopup";
import LeadPopup from "../components/LeadPopup";
import { PriceAlertModal } from "../components/PriceAlertModal";
import { CompareTray } from "../components/CompareTray";
import {
  fetchPublicProviderRegions,
  fetchPublicProviderTours,
} from "../api/publicProviders";
import { loadBootstrap } from "../api/bootstrapCache";
import type { ProviderMeta, ProviderRegion, ToursResult, UnifiedFilters, UnifiedTour } from "../types/providers";
import { useLanguage } from "../hooks/useLanguage";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import { PriceRangeSlider } from "../components/PriceRangeSlider";
import "../site.css";

const PROVIDER_LOGOS: Record<string, string> = {
  alexandria: "/logos/alexandria.png",
  orextravel: "/logos/orextravel.png",
};

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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function inferSingleLevelRegion(provider: ProviderMeta | null, query: string): string | null {
  if (!provider || !query) return null;
  const regionField = provider.filterFields.find((field) => field.key === "zeme");
  if (!regionField?.options?.length) return null;

  const normalizedQuery = normalizeSearchText(query);
  const match = regionField.options.find((option) => {
    const label = normalizeSearchText(String(option.label));
    return normalizedQuery.includes(label) || label.includes(normalizedQuery);
  });

  return match ? String(match.value) : null;
}

function hasTwoLevelRegions(provider: ProviderMeta | null): boolean {
  return Boolean(provider?.filterFields.some((field) => field.dependsOn != null));
}

function supportsFilter(provider: ProviderMeta | null, key: string): boolean {
  return Boolean(provider?.filterFields.some((field) => field.key === key));
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
  const [regions, setRegions] = useState<ProviderRegion[]>([]);
  const [regionsByProvider, setRegionsByProvider] = useState<Record<string, ProviderRegion[]>>({});
  const [providersLoading, setProvidersLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<ToursResult | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try { return (localStorage.getItem("skytravel:viewMode") as "grid" | "list") ?? "grid"; } catch { return "grid"; }
  });
  const [shareCopied, setShareCopied] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const leadPopup = useLeadPopup();
  const [alertTour, setAlertTour] = useState<UnifiedTour | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [heroExpanded, setHeroExpanded] = useState(() => !searchParams.get("q"));
  const [pastHero, setPastHero] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [dateStart, setDateStart] = useState(searchParams.get("dateStart") ?? "");
  const [dateEnd, setDateEnd] = useState(searchParams.get("dateEnd") ?? "");
  const [transport, setTransport] = useState(searchParams.get("transport") ?? "");
  const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = useState(Number(searchParams.get("children")) || 0);

  const selectedProviderId = searchParams.get("provider") || providers[0]?.id || "";
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  );
  const isTwoLevel = hasTwoLevelRegions(selectedProvider);
  const transportSupported = supportsFilter(selectedProvider, "transport");
  const page = getParamNumber(searchParams, "page", 1);
  const limit = getParamNumber(searchParams, "limit", 24);
  const sortBy = searchParams.get("sortBy") === "date" ? "date" : "price";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const activeQuery = searchParams.get("q")?.trim() ?? "";
  const activeDateStart = searchParams.get("dateStart") ?? "";
  const activeDateEnd = searchParams.get("dateEnd") ?? "";
  const activeTransport = searchParams.get("transport") ?? "";
  const activeZeme = searchParams.get("zeme") ?? "";
  const activeTownFrom = searchParams.get("townFrom") ?? "";
  const activeStateId = searchParams.get("stateId") ?? "";
  const activeNights = searchParams.get("nights") ?? "";
  const activeStars = searchParams.get("stars") ?? "";
  const activeBoard = searchParams.get("board") ?? "";
  const hasActiveSearch = Boolean(
    activeQuery || activeDateStart || activeDateEnd || activeTransport || activeZeme || activeTownFrom || activeStateId,
  );

  const cheapThreshold = useMemo(() => {
    if (!result?.items.length) return Infinity;
    const sorted = [...result.items].map((t) => t.price).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.25)] ?? Infinity;
  }, [result]);

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

  const displayedTours = useMemo(() => {
    let items = result?.items ?? [];
    if (showFavoritesOnly) {
      items = items.filter((t) => favorites.includes(`${t.source}-${t.externalId}`));
    }
    if (activeNights) {
      const [lo, hi] = activeNights.split("-").map(Number);
      items = items.filter((t) => {
        const n = t.nights ?? Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000);
        return n >= lo && n <= hi;
      });
    }
    if (activeStars) {
      const minStars = Number(activeStars);
      items = items.filter((t) => Number(t.stars) >= minStars);
    }
    if (activeBoard) {
      items = items.filter((t) => t.board === activeBoard);
    }
    return items;
  }, [result, activeNights, activeStars, activeBoard, showFavoritesOnly, favorites]);

  const departureCities = useMemo(() => {
    if (!isTwoLevel) return [];
    const map = new Map<number, string>();
    for (const region of regions) {
      const id = region.meta?.departureId as number | undefined;
      const name = region.meta?.departureName as string | undefined;
      if (id != null && name) map.set(id, name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [regions, isTwoLevel]);

  const destinationCountries = useMemo(() => {
    if (!isTwoLevel) return [];
    const townFrom = searchParams.get("townFrom");
    const filtered = townFrom
      ? regions.filter((region) => String(region.meta?.departureId) === townFrom)
      : regions;
    const map = new Map<number, string>();
    for (const region of filtered) map.set(region.id, region.name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [regions, isTwoLevel, searchParams]);

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: Record<string, null> }[] = [];
    if (activeQuery) chips.push({ label: `"${activeQuery}"`, clear: { q: null } });
    if (activeDateStart) chips.push({ label: `Od ${fmtDate(activeDateStart)}`, clear: { dateStart: null } });
    if (activeDateEnd) chips.push({ label: `Do ${fmtDate(activeDateEnd)}`, clear: { dateEnd: null } });
    if (activeTransport) chips.push({ label: transportLabel[activeTransport] ?? activeTransport, clear: { transport: null } });
    if (activeZeme) {
      const region = regions.find((r) => String(r.id) === activeZeme);
      chips.push({ label: region?.name ?? activeZeme, clear: { zeme: null } });
    }
    if (activeStateId) {
      const dest = destinationCountries.find((c) => String(c.id) === activeStateId);
      chips.push({ label: dest?.name ?? activeStateId, clear: { stateId: null } });
    }
    if (activeTownFrom) {
      const city = departureCities.find((c) => String(c.id) === activeTownFrom);
      chips.push({ label: `Z: ${city?.name ?? activeTownFrom}`, clear: { townFrom: null, stateId: null } });
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
  }, [activeQuery, activeDateStart, activeDateEnd, activeTransport, activeZeme, activeStateId, activeTownFrom, activeNights, activeStars, activeBoard, searchParams, regions, destinationCountries, departureCities, priceRange]);

  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = loadBootstrap();

    function applyBootstrap(data: { providers: ProviderMeta[]; regionsByProvider: Record<string, ProviderRegion[]> }) {
      if (cancelled) return;
      setProviders(data.providers);
      setRegionsByProvider(data.regionsByProvider);
      const urlProvider = searchParams.get("provider");
      const initial =
        data.providers.find((p) => p.id === urlProvider)?.id ??
        data.providers[0]?.id ??
        "";
      setRegions(data.regionsByProvider[initial] ?? []);
      if (!urlProvider && initial) {
        const next = new URLSearchParams(searchParams);
        next.set("provider", initial);
        setSearchParams(next, { replace: true });
      }
    }

    if (cached) {
      applyBootstrap(cached);
      setProvidersLoading(false);
    }

    fresh
      .then((data) => {
        applyBootstrap(data);
        setProvidersLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : "Nepodařilo se načíst poskytovatele.");
          setProvidersLoading(false);
        }
        // If we already rendered from cache, swallow the revalidation error.
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setDateStart(searchParams.get("dateStart") ?? "");
    setDateEnd(searchParams.get("dateEnd") ?? "");
    setTransport(searchParams.get("transport") ?? "");
    setAdults(Number(searchParams.get("adults")) || 2);
    setChildren(Number(searchParams.get("children")) || 0);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedProviderId) return;

    // Fast path: we already have regions for this provider from bootstrap.
    const preloaded = regionsByProvider[selectedProviderId];
    if (preloaded) {
      setRegions(preloaded);
      setRegionsLoading(false);
      return;
    }

    let cancelled = false;
    setRegionsLoading(true);
    fetchPublicProviderRegions(selectedProviderId)
      .then((items) => {
        if (!cancelled) {
          setRegions(items);
          setRegionsByProvider((prev) => ({ ...prev, [selectedProviderId]: items }));
        }
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProviderId, regionsByProvider]);

  useEffect(() => {
    if (!searchParams.get("transport") || transportSupported) return;
    const next = new URLSearchParams(searchParams);
    next.delete("transport");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [searchParams, transportSupported, setSearchParams]);

  useEffect(() => {
    if (!isTwoLevel) return;
    const stateId = searchParams.get("stateId");
    if (!stateId) return;
    const isValidState = destinationCountries.some((country) => String(country.id) === stateId);
    if (isValidState) return;
    const next = new URLSearchParams(searchParams);
    next.delete("stateId");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isTwoLevel, destinationCountries, searchParams, setSearchParams]);

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

  const buildFilters = useCallback((): UnifiedFilters => {
    const filters: UnifiedFilters = {
      page,
      limit,
      sortBy,
      sortDir,
    };
    const q = searchParams.get("q")?.trim();
    const start = searchParams.get("dateStart");
    const end = searchParams.get("dateEnd");
    const activeTransport = searchParams.get("transport");
    const zeme = searchParams.get("zeme");
    const townFrom = searchParams.get("townFrom");
    const stateId = searchParams.get("stateId");
    const inferredZeme = !isTwoLevel && !zeme && q ? inferSingleLevelRegion(selectedProvider, q) : null;

    if (q) filters.q = q;
    if (start) filters.dateStart = start;
    if (end) filters.dateEnd = end;
    if (transportSupported && activeTransport) filters.transport = activeTransport;
    if (!isTwoLevel && (zeme || inferredZeme)) filters.zeme = zeme || inferredZeme;
    if (isTwoLevel && townFrom) filters.townFrom = townFrom;
    if (isTwoLevel && stateId) filters.stateId = stateId;
    const pMin = searchParams.get("priceMin");
    const pMax = searchParams.get("priceMax");
    if (pMin) filters.priceMin = Number(pMin);
    if (pMax) filters.priceMax = Number(pMax);
    const adultCount = searchParams.get("adults");
    const childCount = searchParams.get("children");
    if (adultCount) filters.adults = Number(adultCount);
    if (childCount) filters.children = Number(childCount);
    return filters;
  }, [searchParams, page, limit, sortBy, sortDir, transportSupported, isTwoLevel, selectedProvider]);

  useEffect(() => {
    if (!selectedProviderId) return;
    if (!hasActiveSearch) {
      setResult(null);
      setError(null);
      setResultsLoading(false);
      return;
    }
    let cancelled = false;
    setResultsLoading(true);
    setError(null);
    fetchPublicProviderTours(selectedProviderId, buildFilters())
      .then((data) => {
        if (!cancelled) setResult(data);
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
  }, [selectedProviderId, selectedProvider, buildFilters, hasActiveSearch]);

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
      provider: selectedProviderId,
      q: query.trim(),
      dateStart,
      dateEnd,
      transport: transportSupported ? transport : null,
      adults,
      children,
      page: 1,
    });
  }

  function changeProvider(providerId: string) {
    setValidationError(null);
    const next = new URLSearchParams(searchParams);
    next.set("provider", providerId);
    next.set("page", "1");
    next.delete("zeme");
    next.delete("townFrom");
    next.delete("stateId");
    const nextProvider = providers.find((provider) => provider.id === providerId) ?? null;
    if (!supportsFilter(nextProvider, "transport")) next.delete("transport");
    setSearchParams(next);
  }

  function setView(mode: "grid" | "list") {
    setViewMode(mode);
    try { localStorage.setItem("skytravel:viewMode", mode); } catch {}
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function shareSearch() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "SkyTravel search", url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  }

  function resetFilters() {
    const next = new URLSearchParams();
    if (selectedProviderId) next.set("provider", selectedProviderId);
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
  }

  const compareTours = useMemo(
    () => displayedTours.filter((t) => compareIds.includes(`${t.source}-${t.externalId}`)),
    [displayedTours, compareIds],
  );

  const totalText = result
    ? `Nalezeno ${result.filtered.toLocaleString("cs-CZ")} nabídek`
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
                    disabled={!transportSupported}
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
              {isTwoLevel && (
                <label>
                  <span>Odjezd z</span>
                  <div className="public-search-input">
                    <Plane size={18} aria-hidden="true" />
                    <select
                      value={searchParams.get("townFrom") ?? ""}
                      onChange={(e) => updateParams({ townFrom: e.target.value, stateId: null, page: 1 })}
                    >
                      <option value="">Všechna města</option>
                      {departureCities.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                </label>
              )}
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
                <h2>Partner</h2>
                {providersLoading ? (
                  <p>Načítání partnerů…</p>
                ) : (
                  <div className="search-provider-list">
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        className={provider.id === selectedProviderId ? "is-active" : ""}
                        onClick={() => changeProvider(provider.id)}
                      >
                        {PROVIDER_LOGOS[provider.id] && (
                          <img
                            src={PROVIDER_LOGOS[provider.id]}
                            alt=""
                            className="provider-logo"
                            aria-hidden="true"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        {provider.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="search-filter-block">
                <h2>Oblast</h2>
                {regionsLoading ? (
                  <p>Načítání oblastí…</p>
                ) : isTwoLevel ? (
                  <div className="search-stacked-controls">
                    <label>
                      <span>Odjezd z</span>
                      <select
                        value={searchParams.get("townFrom") ?? ""}
                        onChange={(event) => updateParams({ townFrom: event.target.value, stateId: null, page: 1 })}
                      >
                        <option value="">Všechna města</option>
                        {departureCities.map((city) => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Destinace</span>
                      <select
                        value={searchParams.get("stateId") ?? ""}
                        onChange={(event) => updateParams({ stateId: event.target.value, page: 1 })}
                      >
                        <option value="">Všechny destinace</option>
                        {destinationCountries.map((country) => (
                          <option key={country.id} value={country.id}>{country.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="search-region-list">
                    <button
                      type="button"
                      className={!searchParams.get("zeme") ? "is-active" : ""}
                      onClick={() => updateParams({ zeme: null, page: 1 })}
                    >
                      Všechny země
                    </button>
                    {[...new Map(regions.map((r) => [r.id, r])).values()].map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        className={searchParams.get("zeme") === String(region.id) ? "is-active" : ""}
                        onClick={() => updateParams({ zeme: region.id, page: 1 })}
                      >
                        {region.name}
                        {region.count != null && region.count > 0 && (
                          <span className="region-count">({region.count})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
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
                  <p>{selectedProvider?.label ?? "Partner"}</p>
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
                  {hasActiveSearch && result && (
                    <button type="button" className="share-btn" onClick={shareSearch}>
                      <Share2 size={14} aria-hidden="true" />
                      {shareCopied ? "Zkopírováno!" : "Sdílet"}
                    </button>
                  )}
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
                      cheapThreshold={cheapThreshold}
                      viewMode={viewMode}
                      isFavorite={isFavorite(tourId)}
                      onToggleFavorite={() => toggleFavorite(tourId)}
                      isComparing={compareIds.includes(tourId)}
                      onToggleCompare={() => toggleCompare(tourId)}
                      compareDisabled={!compareIds.includes(tourId) && compareIds.length >= 3}
                      onAlertClick={() => setAlertTour(tour)}
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
            {[activeZeme, activeStateId, activeTownFrom, activeTransport, activeNights, activeStars, activeBoard].filter(Boolean).length > 0 && (
              <span className="mobile-filter-fab__count">
                {[activeZeme, activeStateId, activeTownFrom, activeTransport, activeNights, activeStars, activeBoard].filter(Boolean).length}
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
                <h2>Partner</h2>
                {providersLoading ? <p>Načítání partnerů…</p> : (
                  <div className="search-provider-list">
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        className={provider.id === selectedProviderId ? "is-active" : ""}
                        onClick={() => { changeProvider(provider.id); setMobileFiltersOpen(false); }}
                      >
                        {PROVIDER_LOGOS[provider.id] && (
                          <img src={PROVIDER_LOGOS[provider.id]} alt="" className="provider-logo" aria-hidden="true" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        )}
                        {provider.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="search-filter-block">
                <h2>Oblast</h2>
                {regionsLoading ? <p>Načítání oblastí…</p> : isTwoLevel ? (
                  <div className="search-stacked-controls">
                    <label>
                      <span>Odjezd z</span>
                      <select value={searchParams.get("townFrom") ?? ""} onChange={(e) => updateParams({ townFrom: e.target.value, stateId: null, page: 1 })}>
                        <option value="">Všechna města</option>
                        {departureCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Destinace</span>
                      <select value={searchParams.get("stateId") ?? ""} onChange={(e) => updateParams({ stateId: e.target.value, page: 1 })}>
                        <option value="">Všechny destinace</option>
                        {destinationCountries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="search-region-list">
                    <button type="button" className={!searchParams.get("zeme") ? "is-active" : ""} onClick={() => updateParams({ zeme: null, page: 1 })}>Všechny země</button>
                    {[...new Map(regions.map((r) => [r.id, r])).values()].map((region) => (
                      <button key={region.id} type="button" className={searchParams.get("zeme") === String(region.id) ? "is-active" : ""} onClick={() => updateParams({ zeme: region.id, page: 1 })}>
                        {region.name}
                        {region.count != null && region.count > 0 && <span className="region-count">({region.count})</span>}
                      </button>
                    ))}
                  </div>
                )}
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
      {alertTour && <PriceAlertModal tour={alertTour} onClose={() => setAlertTour(null)} />}
      <CompareTray
        tours={compareTours}
        onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
      />
    </div>
  );
}

function PublicTourCard({
  tour,
  cheapThreshold,
  viewMode,
  isFavorite,
  onToggleFavorite,
  isComparing,
  onToggleCompare,
  compareDisabled,
  onAlertClick,
}: {
  tour: UnifiedTour;
  cheapThreshold: number;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isComparing: boolean;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  onAlertClick: () => void;
}) {
  const stars = starsDisplay(tour.stars);

  const today = new Date();
  const departure = new Date(tour.startDate);
  const daysUntilDeparture = Math.floor((departure.getTime() - today.getTime()) / 86_400_000);
  const isLastMinute = daysUntilDeparture >= 0 && daysUntilDeparture <= 14;
  const isCheap = tour.price <= cheapThreshold;
  const isLastSpot = tour.offersCount != null && tour.offersCount <= 3;

  const nights = tour.nights ?? Math.round(
    (new Date(tour.endDate).getTime() - new Date(tour.startDate).getTime()) / 86_400_000,
  );

  const imageEl = (
    <div className="public-tour-card__image">
      {tour.image ? (
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
          }}
        />
      ) : (
        <div className="card-img-placeholder" />
      )}
      <button
        type="button"
        className={`card-heart${isFavorite ? " is-saved" : ""}`}
        aria-label={isFavorite ? "Odebrat ze záložek" : "Přidat do záložek"}
        onClick={onToggleFavorite}
      >
        <Heart size={16} aria-hidden="true" />
      </button>
      <span className="card-source-badge">{tour.source}</span>
      <div className="card-deal-badges">
        {isLastMinute && <span className="badge badge--urgent">Last Minute</span>}
        {isCheap && !isLastMinute && <span className="badge badge--deal">Výhodná cena</span>}
        {isLastSpot && <span className="badge badge--spot">Poslední místo</span>}
      </div>
    </div>
  );

  const bodyEl = (
    <div className="public-tour-card__body">
      <div className="public-tour-card__meta">
        <span>{boardLabel[tour.board] ?? (tour.board || "Strava dle nabídky")}</span>
        {stars && <span className="public-tour-stars">{stars}</span>}
      </div>
      <h3>{tour.title}</h3>
      <p>{tour.destination}</p>
      <div className="public-tour-facts">
        <span>{fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}</span>
        <span>{transportLabel[tour.transport] ?? tour.transport}</span>
        {Number.isFinite(nights) && nights > 0 && <span>{nights} nocí</span>}
      </div>
      <div className="public-tour-card__footer">
        <strong>od {formatPrice(tour.price)}</strong>
        <a href={tour.url} target="_blank" rel="noreferrer" className="btn-detail">
          <ExternalLink size={16} aria-hidden="true" />
          Detail
        </a>
      </div>
      <div className="card-actions">
        <button type="button" className="card-alert-btn" onClick={onAlertClick}>
          🔔 Upozornit na slevu
        </button>
        <label className="card-compare">
          <input
            type="checkbox"
            checked={isComparing}
            onChange={onToggleCompare}
            disabled={compareDisabled}
          />
          Porovnat
        </label>
      </div>
    </div>
  );

  if (viewMode === "list") {
    return (
      <article className="public-tour-list-item">
        {imageEl}
        {bodyEl}
        <a href={tour.url} target="_blank" rel="noreferrer" className="btn-detail btn-detail--list">
          <ExternalLink size={16} aria-hidden="true" />
          Detail
        </a>
      </article>
    );
  }

  return (
    <article className="public-tour-card">
      {imageEl}
      {bodyEl}
      <div className="public-tour-card__hover-cta">
        <a
          href={tour.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Zobrazit nabídku
        </a>
      </div>
    </article>
  );
}