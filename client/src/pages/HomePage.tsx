import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  favorites,
  heroImages,
  partnerTours,
  type OwnTour,
  type PartnerTour,
} from "../data";
import { formatPrice, normalizeText } from "../utils";
import { useLanguage } from "../hooks/useLanguage";
import { useTours } from "../hooks/useTours";
import { useLeadPopup } from "../hooks/useLeadPopup";
import { useCookieConsent } from "../hooks/useCookieConsent";
import TourModal, { type ModalDetail } from "../components/TourModal";
import TourCard from "../components/TourCard";
import LeadPopup from "../components/LeadPopup";
import CookieConsent from "../components/CookieConsent";
import "../site.css";

function inBudgetRange(price: number, activeBudget: number) {
  if (activeBudget === 10000) return price <= 10000;
  if (activeBudget === 15000) return price > 10000 && price <= 15000;
  if (activeBudget === 20000) return price > 15000 && price <= 20000;
  return price > 20000;
}

export default function HomePage() {
  const { lang, setLang, t } = useLanguage();
  const ownTours = useTours();
  const leadPopup = useLeadPopup();
  const cookies = useCookieConsent();
  
  const budgetOptions = [
    { value: 10000, label: t("budget1") },
    { value: 15000, label: t("budget2") },
    { value: 20000, label: t("budget3") },
    { value: 999999, label: t("budget4") },
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

  const [activeBudget, setActiveBudget] = useState(10000);
  const [activeDestination, setActiveDestination] = useState("");
  const [activeTransport, setActiveTransport] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [modalDetail, setModalDetail] = useState<ModalDetail | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isPeoplePickerOpen, setIsPeoplePickerOpen] = useState(false);
  const [searchDateStart, setSearchDateStart] = useState("2026-02-21");
  const [searchDateEnd, setSearchDateEnd] = useState("2026-04-21");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const topSearchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDestinationRef = useRef<HTMLInputElement | null>(null);
  const budgetRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!budgetRef.current || !indicatorRef.current) return;
    const activeButton = budgetRef.current.querySelector<HTMLButtonElement>(
      "button.is-active"
    );
    if (!activeButton) return;

    const containerRect = budgetRef.current.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();
    const inset = 4;
    const left = activeRect.left - containerRect.left + inset;

    indicatorRef.current.style.width = `${Math.max(activeRect.width - inset * 2, 12)}px`;
    indicatorRef.current.style.transform = `translateX(${left}px)`;
  }, [activeBudget]);

  const filteredPartners = useMemo(() => {
    return partnerTours.filter((tour) => {
      const normalizedDestination = normalizeText(tour.destination);
      const normalizedHotel = normalizeText(tour.hotel);

      const destinationMatch =
        !activeDestination ||
        normalizedDestination.includes(activeDestination) ||
        normalizedHotel.includes(activeDestination);

      const transportMatch = !activeTransport || tour.transport === activeTransport;
      const budgetMatch = inBudgetRange(tour.price, activeBudget);

      return destinationMatch && transportMatch && budgetMatch;
    });
  }, [activeDestination, activeTransport, activeBudget]);

  const lastMinute = useMemo(() => {
    return [...partnerTours].sort((a, b) => a.price - b.price).slice(0, 4);
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchDestinationRef.current?.value ?? "";
    setActiveDestination(normalizeText(value.trim()));
    document.getElementById("allinclusive")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleTopSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = topSearchInputRef.current?.value ?? "";
    if (searchDestinationRef.current) {
      searchDestinationRef.current.value = value;
    }
    setActiveDestination(normalizeText(value.trim()));
    document.getElementById("allinclusive")?.scrollIntoView({ behavior: "smooth" });
  }

  function openOwnTourModal(tour: OwnTour) {
    const i18n = tour.i18n?.[lang] || {};
    const photos = tour.photos && tour.photos.length > 0 ? tour.photos : [tour.image];
    const transportLabel = tour.transport
      ? t(tour.transport as any) || tour.transport
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

  async function openPartnerModal(tour: PartnerTour) {
    const apiInfo = await getPartnerTourDetailsFromApi(tour);
    setModalDetail({
      type: t("modalTypePartner"),
      title: tour.hotel,
      description: t("modalDescPartner"),
      location: tour.destination,
      term: `${tour.term} | ${tour.nights} ${t("nights")}`,
      meta: `${t("from")} ${formatPrice(tour.price)}`,
      source: `${tour.transport} | ${tour.departure} | ${tour.board} \u2022 ${apiInfo.source}`,
      photos: [tour.image],
      isOwnTour: false,
    });
  }

  function openFavoriteModal(item: { destination: string; price: number; image: string }) {
    setModalDetail({
      type: t("modalTypeFav"),
      title: item.destination,
      description: t("modalDescFav"),
      location: t("modalLoc"),
      term: t("modalTerm"),
      meta: `${t("from")} ${formatPrice(item.price)}`,
      source: t("transportOffer"),
      photos: [item.image],
      isOwnTour: false,
    });
  }

  const closeModal = useCallback(() => setModalDetail(null), []);

  function handleBudgetClick(value: number) {
    setActiveBudget(value);
  }

  function handleTransportChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setActiveTransport(event.target.value);
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

  return (
    <div>
      <header className="site-header">
        <div className="container header-top">
          <a className="logo" href="#home" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
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

          {/* Mobile Right Side */}
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
              <a href="#vlastni" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
                {t("navExclusive")}
              </a>
              <a href="#allinclusive" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
                {t("navPartner")}
              </a>
              <a href="#destinace" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
                {t("navTop")}
              </a>
              <a href="#lastminute" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
                Last minute
              </a>
              <a href="#sluzby" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
                {t("navServices")}
              </a>
              <a href="#kontakt" onClick={(e) => { handleNavClick(e); setMobileMenuOpen(false); }}>
                {t("navContact")}
              </a>
              <Link to="/admin-login" onClick={() => setMobileMenuOpen(false)}>{t("navAdmin")}</Link>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="hero">
          <div id="heroCarousel" className="hero-carousel" aria-hidden="true">
            {heroImages.map((url, index) => (
              <div
                key={url}
                className={`hero-slide${index === heroIndex ? " is-active" : ""}`}
                style={{ backgroundImage: `url('${url}')` }}
              />
            ))}
          </div>
          <div className="hero__overlay"></div>
          <div className="container hero__content">
            <h1>{t("heroTitle")}</h1>
            <p>{t("heroSubtitle")}</p>
            <a className="hero__btn" href="#vlastni" onClick={handleNavClick}>
              {t("heroBtn")}
            </a>
          </div>

          <div className="container hero-search-wrap">
            <form id="heroSearch" className="hero-search" onSubmit={handleSearchSubmit}>
              <div className="hero-search__fields">
                <div className="hero-search__item">
                  <label htmlFor="searchDestination">{t("searchWhere")}</label>
                  <div className="hero-search__control">
                    <input
                      id="searchDestination"
                      ref={searchDestinationRef}
                      type="text"
                      placeholder={t("searchPlaceholder")}
                    />
                    <span className="hero-search__icon">📍</span>
                  </div>
                </div>
                <div 
                  className="hero-search__item" 
                  style={{ position: "relative", cursor: "pointer" }}
                  onClick={() => {
                      setIsDatePickerOpen(!isDatePickerOpen);
                      setIsPeoplePickerOpen(false);
                  }}
                >
                  <label style={{ pointerEvents: "none" }}>{t("searchDate")}</label>
                  <div className="hero-search__control">
                    <input 
                      id="searchDate" 
                      type="text" 
                      value={`${new Date(searchDateStart).toLocaleDateString(lang === "en" ? "en-US" : "cs-CZ")} - ${new Date(searchDateEnd).toLocaleDateString(lang === "en" ? "en-US" : "cs-CZ")}`} 
                      readOnly 
                      style={{ pointerEvents: "none" }}
                    />
                    <span className="hero-search__icon">📅</span>
                  </div>
                  {isDatePickerOpen && (
                    <div className="search-popover" onClick={(e) => e.stopPropagation()}>
                       <div className="popover-row">
                          <label>{t("searchDeparture")}</label>
                          <input type="date" value={searchDateStart} onChange={(e) => setSearchDateStart(e.target.value)} />
                       </div>
                       <div className="popover-row">
                          <label>{t("searchReturn")}</label>
                          <input type="date" value={searchDateEnd} onChange={(e) => setSearchDateEnd(e.target.value)} />
                       </div>
                       <button type="button" className="popover-done" onClick={() => setIsDatePickerOpen(false)}>
                         {t("searchDone")}
                       </button>
                    </div>
                  )}
                </div>
                <div className="hero-search__item">
                  <label htmlFor="searchTransport">{t("searchTransport")}</label>
                  <div className="hero-search__control">
                    <select id="searchTransport" onChange={handleTransportChange}>
                      <option value="">{t("transportAny")}</option>
                      <option value="letecky">{t("transportFlight")}</option>
                      <option value="autobus">{t("transportBus")}</option>
                      <option value="vlastni">{t("transportOwn")}</option>
                    </select>
                    <span className="hero-search__icon">✈</span>
                  </div>
                </div>
                <div 
                  className="hero-search__item" 
                  style={{ position: "relative", cursor: "pointer" }}
                  onClick={() => {
                      setIsPeoplePickerOpen(!isPeoplePickerOpen);
                      setIsDatePickerOpen(false);
                  }}
                >
                  <label style={{ pointerEvents: "none" }}>{t("searchPeople")}</label>
                  <div className="hero-search__control">
                    <input 
                      id="searchPeople" 
                      type="text" 
                      value={lang === "en" 
                        ? `${adults} adults, ${children} children` 
                        : lang === "uk"
                        ? `${adults} дорослі, ${children} діти`
                        : lang === "ru"
                        ? `${adults} взрослые, ${children} дети`
                        : `${adults} dospělí, ${children} dětí`} 
                      readOnly 
                      style={{ pointerEvents: "none" }}
                    />
                    <span className="hero-search__icon">👥</span>
                  </div>
                  {isPeoplePickerOpen && (
                    <div className="search-popover" onClick={(e) => e.stopPropagation()}>
                        <div className="popover-row">
                            <span className="popover-label">{t("searchAdults")}</span>
                            <div className="stepper">
                                <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))}>-</button>
                                <span>{adults}</span>
                                <button type="button" onClick={() => setAdults(adults + 1)}>+</button>
                            </div>
                        </div>
                        <div className="popover-row">
                            <span className="popover-label">{t("searchChildren")}</span>
                            <div className="stepper">
                                <button type="button" onClick={() => setChildren(Math.max(0, children - 1))}>-</button>
                                <span>{children}</span>
                                <button type="button" onClick={() => setChildren(children + 1)}>+</button>
                            </div>
                        </div>
                        <button type="button" className="popover-done" onClick={() => setIsPeoplePickerOpen(false)}>
                          {t("searchDone")}
                        </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="hero-search__footer">
                <button type="submit">{t("searchBtn")}</button>
              </div>
            </form>
          </div>
        </section>

        <section id="vlastni" className="section section-white">
          <div className="container">
            <header className="section-head">
              <h2>{t("sectionOwnTitle")}</h2>
              <p className="section-subtitle">{t("sectionOwnSub")}</p>
            </header>
            <div id="ownGrid" className="destination-grid">
              {ownTours.map((tour) => (
                <TourCard
                  key={`${tour.id ?? tour.destination}`}
                  tour={tour}
                  onClick={() => openOwnTourModal(tour)}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="lastminute" className="section section-soft">
          <div className="container dual-blocks">
            <article className="stats-card">
              <h3>{t("sectionTodayTitle")}</h3>
              <div className="stats-card__inner">
                <img
                  src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80"
                  alt="Background"
                />
                <div>
                  <p>
                    <strong>{t("sectionToday1")}</strong> {t("sectionToday1b")}
                  </p>
                  <p>
                    <strong>{t("sectionToday2")}</strong> {t("sectionToday2b")}
                  </p>
                  <p className="stats-note">{t("sectionTodayNote")}</p>
                </div>
              </div>
            </article>

            <article className="last-minute-card">
              <h3>{t("sectionLastMinute")}</h3>
              <div id="lastMinuteList" className="last-minute-list">
                {lastMinute.map((tour) => (
                  <article key={tour.hotel} className="last-row" onClick={() => openPartnerModal(tour)}>
                    <div>
                      <h4>{tour.hotel}</h4>
                      <p>{tour.destination}</p>
                    </div>
                    <div>
                      <p>{tour.term}</p>
                      <p>{"\u2605".repeat(tour.stars)}{"\u2606".repeat(5 - tour.stars)}</p>
                    </div>
                    <div>
                      <strong>{t("from")} {formatPrice(tour.price)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>

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
            <div id="partnerCards" className="hotel-grid">
              {filteredPartners.map((tour) => (
                <article key={tour.hotel} className="hotel-card" onClick={() => openPartnerModal(tour)}>
                  <img src={tour.image} alt={tour.hotel} />
                  <div className="hotel-card__body">
                    <div className="hotel-topline">
                      <div className="stars">{"★".repeat(tour.stars)}{"☆".repeat(5 - tour.stars)}</div>
                      <span className="hotel-board-badge">{tour.board}</span>
                    </div>
                    <h3>{tour.hotel}</h3>
                    <p className="hotel-meta">{tour.destination}</p>
                    <div className="hotel-info">
                      <span className="hotel-line">{tour.term} | {tour.nights} nocí</span>
                      <span className="hotel-line">{tour.transport} | {tour.departure}</span>
                    </div>
                    <span className="hotel-price">od {formatPrice(tour.price)}</span>
                  </div>
                </article>
              ))}
            </div>
            {filteredPartners.length === 0 && (
              <p id="emptyState" className="empty-state">
                {t("emptyState")}
              </p>
            )}
          </div>
        </section>

        <section id="destinace" className="section section-white">
          <div className="container">
            <header className="section-head">
              <h2>{t("sectionFavTitle")}</h2>
            </header>
            <div id="favoriteGrid" className="favorite-grid">
              {favorites.map((item) => (
                <article
                  key={item.destination}
                  className="favorite-card"
                  style={{ backgroundImage: `url('${item.image}')` }}
                  onClick={() => openFavoriteModal(item)}
                >
                  <div className="favorite-card__body">
                    <h3>{item.destination}</h3>
                    <span className="price-pill">{t("from")} {formatPrice(item.price)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

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
                />
                <span>{t("polaroid1")}</span>
              </div>
              <div className="polaroid polaroid--alt">
                <img
                  src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=80"
                  alt="Vlastní zážitky"
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
            <h5>{t("footerCity")}</h5>
            <p>SkyTravel</p>
            <p>Křižíkova 6, Praha</p>
            <p>{t("footerHours")}</p>
          </div>
          <div>
            <h5>{t("footerContact")}</h5>
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
            <h5>{t("footerNewsTitle")}</h5>
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

      {modalDetail && (
        <TourModal detail={modalDetail} onClose={closeModal} />
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

function getPartnerTourDetailsFromApi(tour: PartnerTour) {
  return new Promise<{ source: string }>((resolve) => {
    window.setTimeout(() => {
      resolve({ source: `Zdroj: API partnera (${tour.hotel}) - pouze pro čtení` });
    }, 220);
  });
}
