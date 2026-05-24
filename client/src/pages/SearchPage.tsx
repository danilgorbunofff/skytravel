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
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { useLeadPopup } from "../hooks/useLeadPopup";
import LeadPopup from "../components/LeadPopup";
import { TourDetailModal } from "../features/search/components/TourDetailModal";
const CompareViewLazy = lazy(() => import("../features/search/components/CompareView").then(m => ({ default: m.CompareView })));
import { useLanguage } from "../hooks/useLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import { isPlausibleTourPrice } from "../lib/prices";
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
} from "../features/search";
import {
  PublicTourCard,
  SearchFilters,
  SearchHero,
  SearchResultsToolbar,
  StickySearchBar,
  TrustBar,
  MobileFilterDrawer,
} from "../features/search/components";
import { TourCardSkeleton } from "../features/search/components/TourCardSkeleton";
import { CompareTray } from "../features/search/components/CompareTray";
import { useCompare } from "../features/search/hooks/useCompare";
import "../site.css";

export default function SearchPage() {
  const { lang, setLang, t } = useLanguage();
  usePageTitle("Vyhledávání zájezdů");
  const isMobile = useMediaQuery("(max-width: 767px)");

  // ─── Hooks ───────────────────────────────────────────────────────────
  const filters = useSearchFilters(t);
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const leadPopup = useLeadPopup();
  const bootstrap = useBootstrap();

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const results = useSearchResults(
    filters.searchFilterKey,
    filters.searchFilters,
    filters.filterKeyWithoutPage,
    filters.activePriceMin,
    filters.activePriceMax,
    showFavoritesOnly,
    favorites,
    filters.page,
  );
  const offerGroups = useOfferGroups(filters.buildFilters);
  const compare = useCompare();
  const [compareExpanded, setCompareExpanded] = useState(false);

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
      fetchPublicSingleTour(providerId, externalId).then((tour) => {
        offerGroups.openTourDetail(tour);
      }).catch(() => { /* tour not found, silently ignore */ });
    });
  }, [offerGroups]);

  // Update URL with tourId when modal opens/closes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (offerGroups.detailTour) {
      url.searchParams.set("tourId", `${offerGroups.detailTour.source}-${offerGroups.detailTour.externalId}`);
    } else {
      url.searchParams.delete("tourId");
    }
    window.history.replaceState(null, "", url.toString());
  }, [offerGroups.detailTour]);

  // ─── Transient UI state ──────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [heroExpanded, setHeroExpanded] = useState(() => !filters.activeQuery);
  const [pastHero, setPastHero] = useState(false);
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
  // Scroll to results after pagination
  useEffect(() => {
    if (previousPageRef.current === filters.page) return;
    previousPageRef.current = filters.page;
    if (results.resultsLoading) return;
    requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // Cleanup share timeout
  useEffect(
    () => () => {
      if (shareTimeoutRef.current != null) window.clearTimeout(shareTimeoutRef.current);
    },
    [],
  );

  // ─── Handlers ────────────────────────────────────────────────────────
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

  const toursToRender =
    isMobile && !showFavoritesOnly
      ? results.accumulatedItems.filter(
          (tour) =>
            !showFavoritesOnly ||
            favorites.includes(`${tour.source}-${tour.externalId}`),
        )
      : results.displayedTours;

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div>
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

          <form className="top-search" onSubmit={filters.submitSearch}>
            <input
              type="text"
              value={filters.query}
              onChange={(event) => {
                filters.setValidationError(null);
                filters.setQuery(event.target.value);
              }}
              placeholder={t("searchPlaceholder")}
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

      <main className="search-page">
        <SearchHero
          t={t}
          query={filters.query}
          dateStart={filters.dateStart}
          dateEnd={filters.dateEnd}
          transport={filters.transport}
          adults={filters.adults}
          children={filters.children}
          heroExpanded={heroExpanded}
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
          onAdultsChange={(delta) =>
            filters.setAdults((a) => Math.min(9, Math.max(1, a + delta)))
          }
          onChildrenChange={(delta) =>
            filters.setChildren((c) => Math.min(6, Math.max(0, c + delta)))
          }
          onToggleExpanded={() => setHeroExpanded((v) => !v)}
          onSubmit={filters.submitSearch}
          onDestinationSelect={(slug, label) => {
            filters.setQuery(label);
            if (slug) {
              filters.updateParams({ destinationSlug: slug, q: null, page: 1 });
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
                      {isPlausibleTourPrice(dest.price) && (
                        <span>od {formatPrice(dest.price)}</span>
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
                destinations={bootstrap.destinations}
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
              />
            </aside>

            <section className="search-results-main">
              <SearchResultsToolbar
                t={t}
                totalText={totalText}
                toolbarDescription={toolbarDescription}
                displayedCount={results.displayedTours.length}
                totalCount={results.result?.total ?? null}
                filteredCount={results.result?.filtered ?? null}
                sortBy={filters.sortBy}
                sortDir={filters.sortDir}
                viewMode={viewMode}
                shareConfirmation={shareConfirmation}
                onToggleSort={filters.toggleSort}
                onSetView={setView}
                onShare={handleShare}
              />

              {results.error && <div className="search-error">{results.error}</div>}

              {results.resultsLoading && !results.result && (
                <TourCardSkeleton count={6} viewMode={viewMode} />
              )}

              {!results.resultsLoading && !results.error && results.result?.items.length === 0 && (
                <div className="search-empty search-empty--results">
                  <div className="search-empty__icon">🔍</div>
                  <h3>{t("sNoResultsTitle")}</h3>
                  <p>{t("sNoResultsBody")}</p>
                  <ul className="search-empty__tips">
                    <li>
                      <button type="button" onClick={handleResetFilters}>
                        {t("sNoResultsTipReset")}
                      </button>
                    </li>
                    <li>{t("sNoResultsTipDates")}</li>
                    <li>{t("sNoResultsTipRegion")}</li>
                    <li>
                      {t("sNoResultsTipCallPre")}{" "}
                      <a href="tel:+420721163860">{t("sNoResultsTipCallLink")}</a>{" "}
                      {t("sNoResultsTipCallPost")}
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

              {!filters.hasUserFilters && (
                <div className="preset-pills">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="preset-pill"
                      onClick={() => filters.updateParams({ ...preset.params, page: 1 })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}

              <div
                className={viewMode === "grid" ? "tour-grid" : "tour-list"}
                aria-busy={results.resultsLoading}
                style={
                  results.resultsLoading && results.result
                    ? { opacity: 0.6, pointerEvents: "none", position: "relative" }
                    : undefined
                }
              >
                {toursToRender.map((tour, index) => {
                  const tourId = `${tour.source}-${tour.externalId}`;
                  return (
                    <PublicTourCard
                      t={t}
                      key={tourId}
                      tour={tour}
                      viewMode={viewMode}
                      isFavorite={isFavorite(tourId)}
                      onToggleFavorite={() => toggleFavorite(tourId)}
                      onOpenDetail={() => offerGroups.openTourDetail(tour)}
                      providerLabel={bootstrap.providerLabels[tour.source]}
                      animationIndex={index}
                      isCompared={compare.isCompared(tourId)}
                      onToggleCompare={() => compare.toggle(tour)}
                      compareFull={compare.isFull}
                    />
                  );
                })}
              </div>

              {results.resultsLoading && results.result && (
                <p
                  style={{ textAlign: "center", color: "#475569", marginTop: 12 }}
                  aria-live="polite"
                >
                  {t("sStateUpdating")}
                </p>
              )}

              {isMobile &&
                !showFavoritesOnly &&
                results.result &&
                filters.page < results.result.totalPages && (
                  <div className="mobile-load-more">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => filters.updateParams({ page: filters.page + 1 })}
                      disabled={results.resultsLoading}
                    >
                      {results.resultsLoading ? t("sLoadingMore") : t("sLoadMore")}
                    </button>
                  </div>
                )}

              {!isMobile &&
                !showFavoritesOnly &&
                results.result &&
                results.result.totalPages > 1 && (
                  <div className="search-pagination">
                    <button
                      type="button"
                      onClick={() => filters.pageTo(filters.page - 1, results.result!.totalPages)}
                      disabled={filters.page <= 1 || results.resultsLoading}
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      {t("sPagePrev")}
                    </button>
                    <span>
                      {t("sPageLabel")} {filters.page} {t("sPageOf")} {results.result.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => filters.pageTo(filters.page + 1, results.result!.totalPages)}
                      disabled={filters.page >= results.result.totalPages || results.resultsLoading}
                    >
                      {t("sPageNext")}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}

              {!isMobile &&
                !showFavoritesOnly &&
                results.result &&
                results.result.totalPages > 1 &&
                results.result.totalPages <= 10 && (
                  <div className="pagination-pills">
                    {Array.from({ length: results.result.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={p === filters.page ? "is-active" : ""}
                        onClick={() => filters.pageTo(p, results.result!.totalPages)}
                        disabled={results.resultsLoading}
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
            {mobileFilterCount > 0 && (
              <span className="mobile-filter-fab__count">{mobileFilterCount}</span>
            )}
          </button>
        </div>
      </main>

      <MobileFilterDrawer
        t={t}
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        destinations={bootstrap.destinations}
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
            bootstrap.providerLabels[offerGroups.detailTour.source] ??
            offerGroups.detailTour.source
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
            onOpenDetail={(tour) => { setCompareExpanded(false); offerGroups.openTourDetail(tour); }}
            t={t}
          />
        </Suspense>
      )}
    </div>
  );
}
