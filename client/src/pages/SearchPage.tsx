/**
 * Public search page — composition root.
 *
 * State management:
 * - Source of truth for query/filters is the URL (`useSearchParams`); local
 *   `useState` is reserved for transient UI (drawer open, share toast, etc.).
 * - Intentionally does NOT use `stores/searchStore` (admin-only) or the
 *   `useProviderTours` hook (used by admin tables). Mixing them here would
 *   create duplicate sources of truth and cause filter/URL drift.
 */
import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import { useLeadPopup } from "../hooks/useLeadPopup";
import LeadPopup from "../components/LeadPopup";
import { TourDetailModal } from "../features/search/components/TourDetailModal";
const CompareViewLazy = lazy(() =>
  import("../features/search/components/CompareView").then((m) => ({ default: m.CompareView })),
);
import { useLanguage } from "../hooks/useLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import { isPlausibleTourPrice } from "../lib/prices";
import { fetchPublicDestinations } from "../api/publicProviders";
import type { PublicDestinationSummary } from "../types/providers";
import { fmtDate } from "../lib/formatters";
import {
  useSearchFilters,
  useSearchResults,
  useOfferGroups,
  useBootstrap,
  getTransportLabel,
  getNightsOptions,
  getBoardOptions,
  getPresets,
  VIEW_MODE_KEY,
  MAX_MOBILE_PAGES,
} from "../features/search";
import {
  SearchFilters,
  SearchHero,
  SearchResultsSection,
  StickySearchBar,
  TrustBar,
  MobileFilterDrawer,
} from "../features/search/components";
import { useRecentSearches } from "../features/search/hooks/useRecentSearches";
import { CompareTray } from "../features/search/components/CompareTray";
import { SearchFooter } from "../components/SearchFooter";
import { SkipToContent } from "../components/SkipToContent";
import { useCompare } from "../features/search/hooks/useCompare";
import "../site.css";

export default function SearchPage() {
  const { lang, setLang, t } = useLanguage();
  usePageTitle("Vyhledávání zájezdů");
  const isMobile = useMediaQuery("(max-width: 767px)");

  // ─── Hooks ───────────────────────────────────────────────────────────
  const filters = useSearchFilters(t);
  const { favorites, favoriteTours, toggle: toggleFavorite, isFavorite } = useFavorites();
  const leadPopup = useLeadPopup();
  const bootstrap = useBootstrap();

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [topQuery, setTopQuery] = useState(filters.query);
  const { save: saveRecent } = useRecentSearches();

  // Keep the header box in step with the committed query. Previously it was
  // seeded once from `filters.query` and never updated, so the header and the
  // hero could show different text.
  useEffect(() => {
    setTopQuery(filters.activeQuery);
  }, [filters.activeQuery]);

  const results = useSearchResults(
    filters.searchFilterKey,
    filters.searchFilters,
    filters.filterKeyWithoutPage,
    filters.activePriceMin,
    filters.activePriceMax,
    showFavoritesOnly,
    favorites,
    filters.page,
    favoriteTours,
  );

  const offerGroups = useOfferGroups(filters.buildFilters);
  const compare = useCompare();
  const [compareExpanded, setCompareExpanded] = useState(false);
  const [destinationLivePrices, setDestinationLivePrices] = useState<
    Record<string, PublicDestinationSummary>
  >({});

  // ─── Deep linking: open tour modal from URL param ────────────────────
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const tourId = params.get("tourId");
    if (!tourId) return;
    deepLinkHandled.current = true;
    const [providerId, ...rest] = tourId.split("-");
    const externalId = rest.join("-");
    if (!providerId || !externalId) return;
    import("../api/publicProviders").then(({ fetchPublicSingleTour }) => {
      fetchPublicSingleTour(providerId, externalId)
        .then((tour) => {
          offerGroups.openTourDetail(tour);
        })
        .catch(() => {
          /* tour not found, silently ignore */
        });
    });
  }, [offerGroups]);

  // Update URL with tourId when modal opens/closes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (offerGroups.detailTour) {
      url.searchParams.set(
        "tourId",
        `${offerGroups.detailTour.source}-${offerGroups.detailTour.externalId}`,
      );
    } else {
      url.searchParams.delete("tourId");
    }
    window.history.replaceState(null, "", url.toString());
  }, [offerGroups.detailTour]);

  // ─── Transient UI state ──────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  // Mobile switches from "accumulate pages" to normal pagination once the
  // accumulated list would grow unbounded. Reset when the filters change so a
  // new search starts in accumulation mode again.
  const [mobileShowAll, setMobileShowAll] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState<"copied" | "failed" | null>(null);
  const shareTimeoutRef = useRef<number | null>(null);
  const resultsSectionRef = useRef<HTMLElement | null>(null);
  const previousPageRef = useRef<number>(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem(VIEW_MODE_KEY) as "grid" | "list") ?? "grid";
    } catch {
      return "grid";
    }
  });

  // ─── Filtered destination counts (respect current filters) ──────────
  const destinations = useMemo(() => {
    if (results.result?.items.length && bootstrap.destinations.length > 0) {
      const counts = new Map<string, number>();
      for (const item of results.result.items) {
        counts.set(item.destination, (counts.get(item.destination) || 0) + 1);
      }
      return bootstrap.destinations.map((d) => ({
        ...d,
        count: counts.get(d.czechName) ?? 0,
      }));
    }
    return bootstrap.destinations;
  }, [results.result?.items, bootstrap.destinations]);

  // ─── Derived ─────────────────────────────────────────────────────────
  const transportLabel = getTransportLabel(t);
  const NIGHTS_OPTIONS = getNightsOptions(t);
  const BOARD_OPTIONS = getBoardOptions(t);
  const PRESETS = getPresets(t);

  const activeChips = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = [];
    if (filters.activeQuery)
      chips.push({
        label: `"${filters.activeQuery}"`,
        onClear: () => filters.updateParams({ q: null, page: 1 }),
      });
    if (filters.activeDateStart)
      chips.push({
        label: `${t("sChipFrom")} ${fmtDate(filters.activeDateStart)}`,
        onClear: () => filters.updateParams({ dateStart: null, page: 1 }),
      });
    if (filters.activeDateEnd)
      chips.push({
        label: `${t("sChipTo")} ${fmtDate(filters.activeDateEnd)}`,
        onClear: () => filters.updateParams({ dateEnd: null, page: 1 }),
      });
    if (filters.activeTransport)
      chips.push({
        label: transportLabel[filters.activeTransport] ?? filters.activeTransport,
        onClear: () => filters.updateParams({ transport: null, page: 1 }),
      });
    if (filters.activeDestinationSlug) {
      const dest = bootstrap.destinations.find(
        (item) => item.slug === filters.activeDestinationSlug,
      );
      chips.push({
        label: dest?.czechName ?? filters.activeDestinationSlug,
        onClear: () => filters.updateParams({ destinationSlug: null, page: 1 }),
      });
    }
    if (filters.activeNights) {
      const opt = NIGHTS_OPTIONS.find((o) => o.value === filters.activeNights);
      chips.push({
        label: opt?.label ?? filters.activeNights,
        onClear: () => filters.updateParams({ nights: null, page: 1 }),
      });
    }
    if (filters.activeStars)
      chips.push({
        label: `★${filters.activeStars}+`,
        onClear: () => filters.updateParams({ stars: null, page: 1 }),
      });
    if (filters.activeBoard) {
      const opt = BOARD_OPTIONS.find((o) => o.value === filters.activeBoard);
      chips.push({
        label: opt?.label ?? filters.activeBoard,
        onClear: () => filters.updateParams({ board: null, page: 1 }),
      });
    }
    if (filters.activePriceMin || filters.activePriceMax) {
      chips.push({
        label: `${t("sChipPrice")}: ${results.priceMin.toLocaleString("cs-CZ")} – ${results.priceMax.toLocaleString("cs-CZ")} Kč`,
        onClear: () => filters.updateParams({ priceMin: null, priceMax: null, page: 1 }),
      });
    }
    if (showFavoritesOnly) {
      chips.push({ label: t("sChipFavorites"), onClear: () => setShowFavoritesOnly(false) });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.activeQuery,
    filters.activeDateStart,
    filters.activeDateEnd,
    filters.activeTransport,
    filters.activeDestinationSlug,
    filters.activeNights,
    filters.activeStars,
    filters.activeBoard,
    filters.activePriceMin,
    filters.activePriceMax,
    results.priceMin,
    results.priceMax,
    showFavoritesOnly,
    t,
  ]);

  // ─── Effects ─────────────────────────────────────────────────────────
  // Scroll to top of results area after pagination
  useEffect(() => {
    if (previousPageRef.current === filters.page) return;
    previousPageRef.current = filters.page;
    if (results.resultsLoading || !results.result) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(".search-results-main");
      if (el) {
        const header = document.querySelector(".site-header") as HTMLElement | null;
        const offset = header ? header.offsetHeight + 16 : 20;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
      }
    });
  }, [filters.page, results.result, results.resultsLoading]);

  // Lock body scroll when mobile filters open
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFiltersOpen]);

  // Track scroll for sticky bar
  useEffect(() => {
    function onScroll() {
      setPastHero(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A new filter set means a new list — drop back to mobile accumulation mode.
  useEffect(() => {
    setMobileShowAll(false);
  }, [filters.filterKeyWithoutPage]);

  // Cleanup share timeout
  useEffect(
    () => () => {
      if (shareTimeoutRef.current != null) window.clearTimeout(shareTimeoutRef.current);
    },
    [],
  );

  // ─── SEO: dynamic title + meta description + canonical URL ────────────
  useEffect(() => {
    const dest = filters.activeQuery || filters.activeDestinationSlug || "";
    const count = results.result?.filtered;
    if (dest && count != null) {
      document.title = `${dest} — ${count} ${count === 1 ? "zájezd" : "zájezdy"} | SkyTravel`;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = dest
        ? `Prohlédněte si ${count ?? "všechny"} nabídky zájezdů do destinace ${dest}. Nejlepší ceny od všech partnerů na SkyTravel.`
        : "SkyTravel — vyhledávač zájezdů. Porovnejte nabídky od všech českých cestovních kanceláří na jednom místě.";
      document.head.appendChild(meta);
    } else if (dest) {
      metaDesc.setAttribute(
        "content",
        `Prohlédněte si ${count ?? "všechny"} nabídky zájezdů do destinace ${dest}. Nejlepší ceny od všech partnerů na SkyTravel.`,
      );
    }

    // Canonical URL
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      canonicalEl.setAttribute("href", window.location.href);
    } else {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = window.location.href;
      document.head.appendChild(link);
    }
  }, [filters.activeQuery, filters.activeDestinationSlug, results.result?.filtered]);

  // ─── JSON‑LD structured data for search results ─────────────────────
  useEffect(() => {
    const items = results.result?.items ?? [];
    if (items.length === 0) return;

    const scriptId = "jsonld-search-results";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Zájezdy: ${filters.activeQuery || filters.activeDestinationSlug || "všechny nabídky"}`,
      numberOfItems: items.length,
      itemListElement: items.slice(0, 10).map((tour, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: tour.title,
          description: tour.description ?? undefined,
          offers: {
            "@type": "Offer",
            price: tour.price,
            priceCurrency: "CZK",
            availability: "https://schema.org/InStock",
          },
          url: `${window.location.origin}/search?tourId=${tour.source}-${tour.externalId}`,
        },
      })),
    });
    document.head.appendChild(script);
  }, [results.result?.items, filters.activeQuery, filters.activeDestinationSlug]);

  // ─── Live prices for popular destinations ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadDestinations() {
      try {
        const items = await fetchPublicDestinations();
        if (cancelled) return;
        setDestinationLivePrices(Object.fromEntries(items.map((item) => [item.czechName, item])));
      } catch {
        if (!cancelled) setDestinationLivePrices({});
      }
    }
    loadDestinations();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      // Try native Web Share API first
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ url, title: document.title });
          return; // Native share dialog handled it — no toast needed
        } catch (shareErr) {
          // AbortError = user cancelled native dialog, do nothing
          if ((shareErr as Error)?.name === "AbortError") return;
          // Otherwise native share failed — fall through to clipboard
        }
      }
      // Fallback: copy URL to clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareConfirmation("copied");
      } else {
        // Last resort: prompt with the URL
        try {
          window.prompt("Zkopírujte adresu:", url);
          setShareConfirmation("copied");
        } catch {
          setShareConfirmation("failed");
        }
      }
    } catch (err) {
      setShareConfirmation("failed");
      console.warn("share failed", err);
    } finally {
      if (shareTimeoutRef.current != null) window.clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = window.setTimeout(() => setShareConfirmation(null), 2500);
    }
  }, []);

  function setView(mode: "grid" | "list") {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // intentionally empty
    }
  }

  function handleResetFilters() {
    filters.resetFilters();
    setShowFavoritesOnly(false);
    offerGroups.closeDetail();
    setMobileFiltersOpen(false);
  }

  function handleToggleFavoritesOnly() {
    setShowFavoritesOnly((v) => {
      const next = !v;
      if (next) filters.updateParams({ page: 1 });
      return next;
    });
  }

  // ─── Computed display values ─────────────────────────────────────────
  const visibleFrom =
    results.result && results.result.filtered > 0
      ? (results.result.page - 1) * results.result.limit + 1
      : 0;
  const visibleTo = results.result
    ? Math.min(results.result.page * results.result.limit, results.result.filtered)
    : 0;
  const totalText = showFavoritesOnly
    ? `${results.displayedTours.length.toLocaleString("cs-CZ")} ${t("sStateSavedHotels")}`
    : results.result
      ? !filters.hasUserFilters
        ? t("sBestDealsTitle")
        : `${t("sStateShown")} ${visibleFrom.toLocaleString("cs-CZ")}–${visibleTo.toLocaleString("cs-CZ")} ${t("sStateOf")} ${results.result.filtered.toLocaleString("cs-CZ")} ${t("sStateHotels")}${results.result.rawFilteredOffers && results.result.rawFilteredOffers > results.result.filtered ? ` (${results.result.rawFilteredOffers.toLocaleString("cs-CZ")} ${t("sStateTerms")})` : ""}`
      : results.resultsLoading
        ? t("sStateLoading")
        : filters.hasUserFilters
          ? t("sStateNoOffers")
          : t("sBestDealsTitle");

  const toolbarDescription = !filters.hasUserFilters ? t("sBestDealsBody") : t("sAllPartners");

  const mobileFilterCount = [
    filters.activeDestinationSlug,
    filters.activeTransport,
    filters.activeNights,
    filters.activeStars,
    filters.activeBoard,
  ].filter(Boolean).length;

  const mobileCapped =
    isMobile && !showFavoritesOnly && !mobileShowAll && filters.page >= MAX_MOBILE_PAGES;

  const toursToRender =
    isMobile && !showFavoritesOnly && !mobileShowAll
      ? results.accumulatedItems
      : results.displayedTours;

  // Persist successful searches for the autocomplete / recent chips.
  const savedQueryRef = useRef("");
  useEffect(() => {
    const q = filters.activeQuery;
    if (!q || showFavoritesOnly) return;
    if (results.resultsLoading || results.error || results.result == null) return;
    if (savedQueryRef.current === q) return;
    savedQueryRef.current = q;
    saveRecent(q, results.result.filtered);
  }, [
    filters.activeQuery,
    results.resultsLoading,
    results.error,
    results.result,
    showFavoritesOnly,
    saveRecent,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div>
      <SkipToContent />
      <StickySearchBar
        t={t}
        visible={pastHero}
        activeQuery={filters.activeQuery}
        activeDateStart={filters.activeDateStart}
        filteredCount={results.result?.filtered ?? null}
      />

      <header className="site-header">
        <div className="container header-top">
          <Link className="logo" to="/">
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </Link>

          <form
            className="top-search"
            onSubmit={(e) => {
              e.preventDefault();
              filters.setValidationError(null);
              filters.updateParams({ q: topQuery.trim() || null, page: 1 });
            }}
          >
            <input
              type="text"
              value={topQuery}
              onChange={(event) => {
                filters.setValidationError(null);
                setTopQuery(event.target.value);
              }}
              placeholder={t("searchPlaceholder")}
              aria-label={t("sFormSearch")}
            />
            <button type="submit" aria-label={t("sFormSearch")}>
              GO
            </button>
          </form>

          <div className="header-contact-wrap desktop-only">
            <div className="header-contact">
              <a href="tel:+420721163860">+420 721 163 860</a>
              <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
            </div>
            <div className="lang-toggle" aria-label="Language switcher">
              {(
                [
                  { code: "cs", flag: "🇨🇿" },
                  { code: "uk", flag: "🇺🇦" },
                  { code: "en", flag: "🇬🇧" },
                  { code: "ru", flag: "🇷🇺" },
                ] as const
              ).map((item) => (
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
              {(
                [
                  { code: "cs", flag: "🇨🇿" },
                  { code: "uk", flag: "🇺🇦" },
                  { code: "en", flag: "🇬🇧" },
                  { code: "ru", flag: "🇷🇺" },
                ] as const
              ).map((item) => (
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
            <button
              className="hamburger"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
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

      <main id="main-content" className="search-page">
        <SearchHero
          t={t}
          query={filters.query}
          dateStart={filters.dateStart}
          dateEnd={filters.dateEnd}
          transport={filters.transport}
          adults={filters.adults}
          children={filters.children}
          dateError={filters.dateError}
          validationError={filters.validationError}
          destinations={bootstrap.destinations}
          onQueryChange={(v) => {
            filters.setValidationError(null);
            filters.setQuery(v);
          }}
          onDateStartChange={(v) => {
            filters.setDateStart(v);
            filters.setValidationError(null);
          }}
          onDateEndChange={(v) => {
            filters.setDateEnd(v);
            filters.setValidationError(null);
          }}
          onTransportChange={(v) => {
            filters.setValidationError(null);
            filters.setTransport(v);
          }}
          onAdultsChange={(v) => filters.setAdults(v)}
          onChildrenChange={(v) => filters.setChildren(v)}
          onSubmit={filters.submitSearch}
          onDestinationSelect={(slug, label) => {
            filters.setQuery(label);
            if (slug) {
              filters.updateParams({ destinationSlug: slug, q: null, page: 1 });
            } else {
              // Recent-search suggestions carry no slug. Previously this only
              // filled the input, so clicking one never ran a search.
              filters.updateParams({ q: label, page: 1 });
            }
          }}
        />

        <TrustBar t={t} />

        {!filters.hasUserFilters && popularDestinations.length > 0 && (
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
                      filters.setQuery(dest.destination);
                      filters.updateParams({ q: dest.destination, page: 1 });
                    }}
                  >
                    <div
                      className="dest-thumb__img"
                      style={{ backgroundImage: `url(${dest.image})` }}
                    />
                    <div className="dest-thumb__label">
                      <strong>{dest.destination}</strong>
                      {isPlausibleTourPrice(
                        destinationLivePrices[dest.destination]?.minPrice ?? dest.price,
                      ) && (
                        <span>
                          od{" "}
                          {formatPrice(
                            destinationLivePrices[dest.destination]?.minPrice ?? dest.price,
                          )}
                        </span>
                      )}
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
              <SearchFilters
                t={t}
                filters={filters}
                destinations={destinations}
                destinationsStatus={bootstrap.destinationsStatus}
                destinationsError={bootstrap.destinationsError}
                onRetryDestinations={bootstrap.retryDestinations}
                naturalPriceRange={results.naturalPriceRange}
                priceRange={results.priceRange}
                priceMin={results.priceMin}
                priceMax={results.priceMax}
                hasResults={results.hasLoadedOnce}
                favoritesCount={favorites.length}
                showFavoritesOnly={showFavoritesOnly}
                onToggleFavoritesOnly={handleToggleFavoritesOnly}
                onReset={handleResetFilters}
              />
            </aside>

            <SearchResultsSection
              t={t}
              result={results.result}
              loading={results.resultsLoading}
              error={results.error}
              onRetry={results.retry}
              pendingPage={results.pendingPage}
              viewMode={viewMode}
              onSetView={setView}
              page={filters.page}
              totalPages={results.result?.totalPages ?? 1}
              onPageChange={(p) => {
                const el = document.querySelector<HTMLElement>(".search-results-main");
                if (el) {
                  const header = document.querySelector(".site-header") as HTMLElement | null;
                  const offset = header ? header.offsetHeight + 16 : 20;
                  const top = el.getBoundingClientRect().top + window.scrollY - offset;
                  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
                }
                filters.pageTo(p, results.result?.totalPages ?? 1);
              }}
              sortBy={filters.sortBy}
              sortDir={filters.sortDir}
              onToggleSort={filters.toggleSort}
              totalText={totalText}
              toolbarDescription={toolbarDescription}
              displayedCount={toursToRender.length}
              totalCount={results.result?.total ?? null}
              filteredCount={results.result?.filtered ?? null}
              toursToRender={toursToRender}
              chips={activeChips.map((c) => ({ key: c.label, ...c }))}
              onResetFilters={handleResetFilters}
              shareConfirmation={shareConfirmation}
              onShare={handleShare}
              providerLabels={bootstrap.providerLabels}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onOpenDetail={offerGroups.openTourDetail}
              isCompared={(id) => compare.isCompared(id)}
              onToggleCompare={compare.toggle}
              compareFull={compare.isFull}
              presets={PRESETS}
              onPresetClick={(params) => filters.updateParams({ ...params, page: 1 })}
              isMobile={isMobile}
              showFavoritesOnly={showFavoritesOnly}
              onLoadMore={() => filters.updateParams({ page: filters.page + 1 })}
              hasUserFilters={filters.hasUserFilters}
              mobileCapped={mobileCapped}
              onShowAll={() => setMobileShowAll(true)}
              mobileShowAll={mobileShowAll}
            />
          </div>
        </section>

        <div className="mobile-filter-fab mobile-only">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label={t("sFilterFab")}
          >
            {t("sFilterFab")}
            {mobileFilterCount > 0 && (
              <span className="mobile-filter-fab__count">{mobileFilterCount}</span>
            )}
          </button>
        </div>
      </main>

      <SearchFooter t={t} />

      <MobileFilterDrawer
        t={t}
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        destinations={destinations}
        destinationsStatus={bootstrap.destinationsStatus}
        destinationsError={bootstrap.destinationsError}
        onRetryDestinations={bootstrap.retryDestinations}
        naturalPriceRange={results.naturalPriceRange}
        priceRange={results.priceRange}
        priceMin={results.priceMin}
        priceMax={results.priceMax}
        hasResults={results.result !== null}
        favoritesCount={favorites.length}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={handleToggleFavoritesOnly}
        onReset={handleResetFilters}
        filteredCount={results.result?.filtered ?? null}
      />

      <LeadPopup
        {...leadPopup}
        prefilledQuery={filters.activeQuery || undefined}
        prefilledDateStart={filters.activeDateStart || undefined}
      />

      {offerGroups.detailTour && (
        <TourDetailModal
          tour={offerGroups.detailTour}
          providerLabel={
            bootstrap.providerLabels[offerGroups.detailTour.source] ?? offerGroups.detailTour.source
          }
          offers={
            offerGroups.detailTour.offerGroupKey &&
            offerGroups.offerGroupItems[offerGroups.detailTour.offerGroupKey]
              ? offerGroups.offerGroupItems[offerGroups.detailTour.offerGroupKey]
              : [offerGroups.detailTour]
          }
          loading={
            offerGroups.detailTour.offerGroupKey
              ? Boolean(offerGroups.offerGroupLoading[offerGroups.detailTour.offerGroupKey])
              : false
          }
          error={
            offerGroups.detailTour.offerGroupKey
              ? offerGroups.offerGroupErrors[offerGroups.detailTour.offerGroupKey]
              : undefined
          }
          relatedTours={results.result?.items ?? []}
          onClose={offerGroups.closeDetail}
          onNavigateToTour={offerGroups.openTourDetail}
        />
      )}

      {!compareExpanded && (
        <CompareTray
          tours={compare.tours}
          onExpand={() => setCompareExpanded(true)}
          onRemove={compare.remove}
          onClear={compare.clear}
        />
      )}

      {compareExpanded && (
        <Suspense fallback={null}>
          <CompareViewLazy
            tours={compare.tours}
            onRemove={compare.remove}
            onClear={compare.clear}
            onClose={() => setCompareExpanded(false)}
            onOpenDetail={(tour) => {
              setCompareExpanded(false);
              offerGroups.openTourDetail(tour);
            }}
            t={t}
          />
        </Suspense>
      )}
    </div>
  );
}
