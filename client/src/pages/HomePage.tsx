import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { favorites, heroImages, type OwnTour } from "../data";
import { formatPrice } from "../utils";
import { fetchAlexandriaLastMinute, type AlexandriaLastMinuteItem } from "../api";
import { fetchPublicDestinations, fetchPublicAllProviderTours } from "../api/publicProviders";
import type { PublicDestinationSummary, UnifiedTour } from "../types/providers";
import { TourDetailModal } from "../features/search/components/TourDetailModal";
import { PublicTourCard } from "../features/search/components/PublicTourCard";
import { useLanguage } from "../hooks/useLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import { useTours } from "../hooks/useTours";
import { useLeadPopup } from "../hooks/useLeadPopup";
import { useCookieConsent } from "../hooks/useCookieConsent";
import { SkipToContent } from "../components/SkipToContent";
import TourModal, { type ModalDetail } from "../components/TourModal";
import LeadPopup from "../components/LeadPopup";
import CookieConsent from "../components/CookieConsent";
import SearchHero from "../components/home/SearchHero";
import TourGrid from "../components/home/TourGrid";
import LastMinuteDeals from "../components/home/LastMinuteDeals";
import FavoriteDestinations from "../components/home/FavoriteDestinations";
import "../site.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  usePageTitle();
  const ownTours = useTours();
  const leadPopup = useLeadPopup();
  const cookies = useCookieConsent();

  const budgetOptions = [
    { value: 20000, label: "20 000 – 25 000 Kč" },
    { value: 25000, label: "25 000 – 30 000 Kč" },
    { value: 35000, label: "35 000+ Kč" },
  ];

  function formatDateRange(start?: string, end?: string) {
    if (!start || !end) return t("transportOffer");
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return t("transportOffer");
    }
    return `${startDate.toLocaleDateString("cs-CZ")} - ${endDate.toLocaleDateString("cs-CZ")}`;
  }

  const [activeBudget, setActiveBudget] = useState(20000);
  const [heroIndex, setHeroIndex] = useState(0);
  const [modalDetail, setModalDetail] = useState<ModalDetail | null>(null);
  const [lastMinuteDetail, setLastMinuteDetail] = useState<UnifiedTour | null>(null);
  const [allIncTours, setAllIncTours] = useState<UnifiedTour[]>([]);
  const [allIncLoading, setAllIncLoading] = useState(true);
  const [allIncDetail, setAllIncDetail] = useState<UnifiedTour | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [searchDateStart, setSearchDateStart] = useState("2026-02-21");
  const [searchDateEnd, setSearchDateEnd] = useState("2026-04-21");
  const [destinationCounts, setDestinationCounts] = useState<
    Record<string, PublicDestinationSummary>
  >({});

  const topSearchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDestinationRef = useRef<HTMLInputElement | null>(null);
  const searchTransportRef = useRef<HTMLSelectElement | null>(null);
  const budgetRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDestinations() {
      try {
        const items = await fetchPublicDestinations();
        if (cancelled) return;
        setDestinationCounts(Object.fromEntries(items.map((item) => [item.czechName, item])));
      } catch {
        if (!cancelled) setDestinationCounts({});
      }
    }
    loadDestinations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!budgetRef.current || !indicatorRef.current) return;
    const activeButton = budgetRef.current.querySelector<HTMLButtonElement>("button.is-active");
    if (!activeButton) return;

    const containerRect = budgetRef.current.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();
    const inset = 4;
    const left = activeRect.left - containerRect.left + inset;

    indicatorRef.current.style.width = `${Math.max(activeRect.width - inset * 2, 12)}px`;
    indicatorRef.current.style.transform = `translateX(${left}px)`;
  }, [activeBudget]);

  // ── Live Alexandria last-minute offers ──────────────────────
  const [lastMinuteItems, setLastMinuteItems] = useState<AlexandriaLastMinuteItem[]>([]);
  const [lastMinuteLoading, setLastMinuteLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchAlexandriaLastMinute(4);
        if (!cancelled) setLastMinuteItems(data.items);
      } catch {
        // fall back to empty; static partner tours still visible below
      } finally {
        if (!cancelled) setLastMinuteLoading(false);
      }
    }
    load();
    // Auto-refresh every 5 minutes
    const interval = window.setInterval(load, 5 * 60 * 1000);
    // Also refresh on tab focus
    function onFocus() {
      load();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  function openLastMinuteModal(item: AlexandriaLastMinuteItem) {
    const tour: UnifiedTour = {
      externalId: item.externalId,
      destination: item.destination,
      title: item.title,
      price: item.price,
      originalPrice: item.originalPrice,
      startDate: item.startDate,
      endDate: item.endDate,
      transport: item.transport,
      image: item.image,
      description: item.description,
      photos: item.photos,
      url: item.url,
      stars: item.stars,
      board: item.board,
      source: "alexandria",
      offersCount: 1,
    };
    setLastMinuteDetail(tour);
  }

  // ── All-inclusive tours (inline tab content) ──────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setAllIncLoading(true);
      try {
        const filters: Record<string, string | number> = { board: "AI,UAI" };
        if (activeBudget === 20000) {
          filters.priceMin = 20000;
          filters.priceMax = 25000;
        } else if (activeBudget === 25000) {
          filters.priceMin = 25000;
          filters.priceMax = 30000;
        } else {
          filters.priceMin = 35000;
        }
        const result = await fetchPublicAllProviderTours(filters as never);
        if (!cancelled) setAllIncTours(result.items ?? []);
      } catch {
        if (!cancelled) setAllIncTours([]);
      } finally {
        if (!cancelled) setAllIncLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeBudget]);

  const lastMinuteRelated = useMemo(() => {
    if (!lastMinuteDetail) return [];
    return lastMinuteItems
      .filter((item) => item.externalId !== lastMinuteDetail.externalId)
      .map((item) => ({
        externalId: item.externalId,
        destination: item.destination,
        title: item.title,
        price: item.price,
        originalPrice: item.originalPrice,
        startDate: item.startDate,
        endDate: item.endDate,
        transport: item.transport,
        image: item.image,
        description: item.description,
        photos: item.photos,
        url: item.url,
        stars: item.stars,
        board: item.board,
        source: "alexandria" as const,
        offersCount: 1,
      }));
  }, [lastMinuteDetail, lastMinuteItems]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const value = searchDestinationRef.current?.value.trim() ?? "";
    const transport = searchTransportRef.current?.value ?? "";
    if (value) params.set("q", value);
    if (searchDateStart) params.set("dateStart", searchDateStart);
    if (searchDateEnd) params.set("dateEnd", searchDateEnd);
    if (transport) params.set("transport", transport);
    navigate(`/search${params.toString() ? `?${params}` : ""}`);
  }

  function handleTopSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = topSearchInputRef.current?.value ?? "";
    if (searchDestinationRef.current) {
      searchDestinationRef.current.value = value;
    }
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    navigate(`/search${params.toString() ? `?${params}` : ""}`);
  }

  function openOwnTourModal(tour: OwnTour) {
    const i18n = tour.i18n?.[lang] || {};
    const photos = tour.photos && tour.photos.length > 0 ? tour.photos : [tour.image];
    const transportLabel = tour.transport
      ? t(tour.transport as never) || tour.transport
      : t("transportOffer");
    setModalDetail({
      type: t("modalTypeOwn"),
      title: i18n.destination || tour.destination,
      description: i18n.description || tour.description || t("modalDescOwn"),
      location: i18n.destination || tour.destination,
      term: formatDateRange(tour.startDate, tour.endDate),
      meta: `${t("from")} ${formatPrice(tour.price)}`,
      source: transportLabel,
      photos,
      isOwnTour: true,
      tourId: tour.id,
    });
  }

  function openFavoriteSearch(item: { destination: string }) {
    const params = new URLSearchParams();
    params.set("q", item.destination);
    navigate(`/search?${params}`);
  }

  const allIncRelated = useMemo(() => {
    if (!allIncDetail) return [];
    return allIncTours.filter(
      (t) => `${t.source}-${t.externalId}` !== `${allIncDetail.source}-${allIncDetail.externalId}`,
    );
  }, [allIncDetail, allIncTours]);

  const closeModal = useCallback(() => setModalDetail(null), []);

  function handleBudgetClick(value: number) {
    setActiveBudget(value);
  }

  const CARD_SCROLL = 340;
  function scrollCarousel(dir: "left" | "right") {
    if (!carouselRef.current) return;
    const amount = dir === "left" ? -CARD_SCROLL : CARD_SCROLL;
    carouselRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
    const href = event.currentTarget.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    const header = document.querySelector(".site-header") as HTMLElement | null;
    const headerOffset = header ? header.offsetHeight : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }

  function handleDateToggle() {
    setIsDatePickerOpen((prev) => !prev);
  }

  function handleDateChange(field: "start" | "end", value: string) {
    if (field === "start") setSearchDateStart(value);
    else setSearchDateEnd(value);
  }

  return (
    <div>
      <SkipToContent />
      <header className="site-header">
        <div className="container header-top">
          <a
            className="logo"
            href="#home"
            onClick={(e) => {
              handleNavClick(e);
              setMobileMenuOpen(false);
            }}
          >
            <span className="logo__sky">Sky</span>
            <span className="logo__travel">Travel</span>
          </a>

          <form id="topSearch" className="top-search" onSubmit={handleTopSearchSubmit}>
            <input
              id="topSearchInput"
              ref={topSearchInputRef}
              type="text"
              placeholder={t("searchPlaceholder")}
            />
            <button type="submit" aria-label="Vyhledat">
              GO
            </button>
          </form>

          {/* Desktop Right Side */}
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

          {/* Mobile Right Side */}
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Desktop Nav / Mobile Drawer */}
        <div className={`site-nav-wrapper ${mobileMenuOpen ? "is-open" : ""}`}>
          <div className="container site-nav-inner">
            <div className="header-contact mobile-only mobile-contact">
              <a href="tel:+420721163860">+420 721 163 860</a>
              <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
            </div>
            <nav className="main-nav">
              <a
                href="#vlastni"
                onClick={(e) => {
                  handleNavClick(e);
                  setMobileMenuOpen(false);
                }}
              >
                {t("navExclusive")}
              </a>
              <a
                href="#allinclusive"
                onClick={(e) => {
                  handleNavClick(e);
                  setMobileMenuOpen(false);
                }}
              >
                {t("navPartner")}
              </a>
              <a
                href="#destinace"
                onClick={(e) => {
                  handleNavClick(e);
                  setMobileMenuOpen(false);
                }}
              >
                {t("navTop")}
              </a>
              <a
                href="#lastminute"
                onClick={(e) => {
                  handleNavClick(e);
                  setMobileMenuOpen(false);
                }}
              >
                Last minute
              </a>
              <a
                href="#sluzby"
                onClick={(e) => {
                  handleNavClick(e);
                  setMobileMenuOpen(false);
                }}
              >
                {t("navServices")}
              </a>
              <a
                href="#kontakt"
                onClick={(e) => {
                  handleNavClick(e);
                  setMobileMenuOpen(false);
                }}
              >
                {t("navContact")}
              </a>
              <Link to="/admin-login" onClick={() => setMobileMenuOpen(false)}>
                {t("navAdmin")}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main id="main-content">
        <SearchHero
          heroImages={heroImages}
          heroIndex={heroIndex}
          searchDestinationRef={searchDestinationRef}
          searchTransportRef={searchTransportRef}
          searchDateStart={searchDateStart}
          searchDateEnd={searchDateEnd}
          lang={lang}
          isDatePickerOpen={isDatePickerOpen}
          t={t}
          onSearchSubmit={handleSearchSubmit}
          onDateToggle={handleDateToggle}
          onDateChange={handleDateChange}
          onNavClick={handleNavClick}
        />

        <TourGrid
          ownTours={ownTours}
          onTourClick={openOwnTourModal}
          t={t}
        />

        <LastMinuteDeals
          lastMinuteItems={lastMinuteItems}
          loading={lastMinuteLoading}
          onItemClick={openLastMinuteModal}
          t={t}
        />

        <section id="allinclusive" className="section section-blue">
          <div className="container">
            <header className="section-head section-head--white">
              <h2>{t("sectionAllIncTitle")}</h2>
            </header>
            <div id="budgetFilters" className="budget-filters" ref={budgetRef}>
              <span ref={indicatorRef} className="budget-indicator" />
              {budgetOptions.map((option) => (
                <button
                  key={option.value}
                  className={activeBudget === option.value ? "is-active" : ""}
                  data-budget={option.value}
                  type="button"
                  onClick={() => handleBudgetClick(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {allIncLoading ? (
              <div className="allinc-carousel" style={{ marginTop: "1rem" }}>
                <div className="allinc-carousel__track">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="tour-card-skeleton allinc-carousel__skeleton" />
                  ))}
                </div>
              </div>
            ) : allIncTours.length > 0 ? (
              <div className="allinc-carousel" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="allinc-carousel__arrow allinc-carousel__arrow--left"
                  onClick={() => scrollCarousel("left")}
                  aria-label="Předchozí"
                >
                  ‹
                </button>
                <div ref={carouselRef} className="allinc-carousel__track">
                  {allIncTours.map((tour) => (
                    <PublicTourCard
                      key={`${tour.source}-${tour.externalId}`}
                      t={t}
                      tour={tour}
                      viewMode="grid"
                      isFavorite={false}
                      onToggleFavorite={() => {}}
                      onOpenDetail={() => setAllIncDetail(tour)}
                      providerLabel="Alexandria"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="allinc-carousel__arrow allinc-carousel__arrow--right"
                  onClick={() => scrollCarousel("right")}
                  aria-label="Další"
                >
                  ›
                </button>
              </div>
            ) : (
              <p style={{ marginTop: "1rem", color: "#4e5f79", fontWeight: 700 }}>
                {t("emptyState")}
              </p>
            )}
          </div>
        </section>

        <FavoriteDestinations
          favorites={favorites}
          destinationCounts={destinationCounts}
          onClick={openFavoriteSearch}
          t={t}
        />

        <section id="sluzby" className="section section-social">
          <div className="container social-banner">
            <div>
              <h3>{t("sectionSocialTitle")}</h3>
              <p>{t("sectionSocialSub")}</p>
              <div className="social-buttons">
                <a href="#">INSTAGRAM</a>
                <a href="#">FACEBOOK</a>
                <a href="#">TIKTOK</a>
              </div>
            </div>
            <div className="social-cards">
              <div className="polaroid">
                <img
                  src="https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=900&q=80"
                  alt="SkyTravel trip"
                  loading="lazy"
                  decoding="async"
                  width={900}
                  height={600}
                />
                <span>{t("polaroid1")}</span>
              </div>
              <div className="polaroid polaroid--alt">
                <img
                  src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=80"
                  alt="Vlastní zážitky"
                  loading="lazy"
                  decoding="async"
                  width={900}
                  height={600}
                />
                <span>{t("polaroid2")}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="kontakt" className="footer">
        <div className="container footer-main">
          <div>
            <h4>{t("footerCity")}</h4>
            <p>SkyTravel</p>
            <p>Křižíkova 6, Praha</p>
            <p>{t("footerHours")}</p>
          </div>
          <div>
            <h4>{t("footerContact")}</h4>
            <p>
              <a href="tel:+420721163860">+420 721 163 860</a>
            </p>
            <p>
              <a href="tel:+420739100222">+420 739 100 222</a>
            </p>
            <p>
              <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
            </p>
          </div>
          <div className="newsletter">
            <h4>{t("footerNewsTitle")}</h4>
            <input type="email" placeholder={t("modalEmailPlaceholder")} />
            <label>
              <input type="checkbox" /> {t("modalConsentGdpr")}{" "}
              <Link to="/gdpr">{t("modalGdprLink")}.</Link>
            </label>
            <button type="button">{t("footerNewsBtn")}</button>
          </div>
        </div>

        <div className="container footer-bottom">
          <a href="#">{t("navContact")}</a>
          <a href="#">{t("f3_1")}</a>
          <Link to="/gdpr">{t("footerGdpr")}</Link>
          <Link to="/terms">{t("footerTerms")}</Link>
          <span>
            &copy; <span>{new Date().getFullYear()}</span> SkyTravel
          </span>
        </div>
      </footer>

      {modalDetail && <TourModal detail={modalDetail} onClose={closeModal} />}

      {lastMinuteDetail && (
        <TourDetailModal
          tour={lastMinuteDetail}
          providerLabel="Alexandria"
          offers={[lastMinuteDetail]}
          loading={false}
          relatedTours={lastMinuteRelated}
          onClose={() => setLastMinuteDetail(null)}
          onNavigateToTour={(tour) => setLastMinuteDetail(tour)}
        />
      )}

      {allIncDetail && (
        <TourDetailModal
          tour={allIncDetail}
          providerLabel="Alexandria"
          offers={[allIncDetail]}
          loading={false}
          relatedTours={allIncRelated}
          onClose={() => setAllIncDetail(null)}
          onNavigateToTour={(tour) => setAllIncDetail(tour)}
        />
      )}

      <CookieConsent
        showCookies={cookies.showCookies}
        cookieSettingsOpen={cookies.cookieSettingsOpen}
        setCookieSettingsOpen={cookies.setCookieSettingsOpen}
        cookiePrefs={cookies.cookiePrefs}
        setCookiePrefs={cookies.setCookiePrefs}
        applyCookiePrefs={cookies.applyCookiePrefs}
      />

      <LeadPopup {...leadPopup} />
    </div>
  );
}

