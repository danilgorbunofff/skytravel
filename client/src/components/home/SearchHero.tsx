import { useEffect, useState, type Ref } from "react";
import type { TranslationKey } from "../../hooks/useLanguage";
import { heroSrcSet } from "../../data";

interface Props {
  heroImages: string[];
  heroIndex: number;
  searchDestinationRef: Ref<HTMLInputElement>;
  searchTransportRef: Ref<HTMLSelectElement>;
  searchDateStart: string;
  searchDateEnd: string;
  lang: string;
  isDatePickerOpen: boolean;
  t: (key: TranslationKey) => string;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onDateToggle: () => void;
  onDateChange: (field: "start" | "end", value: string) => void;
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** SEO H1 (target query). Falls back to the marketing hero title. */
  h1?: string;
}

export default function SearchHero({
  heroImages,
  heroIndex,
  searchDestinationRef,
  searchTransportRef,
  searchDateStart,
  searchDateEnd,
  lang,
  isDatePickerOpen,
  t,
  onSearchSubmit,
  onDateToggle,
  onDateChange,
  onNavClick,
  h1,
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const dateLocale = lang === "en" ? "en-US" : "cs-CZ";
  const displayDate = `${new Date(searchDateStart).toLocaleDateString(dateLocale)} – ${new Date(searchDateEnd).toLocaleDateString(dateLocale)}`;

  return (
    <section id="home" className="hero">
      <div id="heroCarousel" className="hero-carousel" aria-hidden="true">
        {heroImages.map((url, index) => (
          <div key={url} className={`hero-slide${index === heroIndex ? " is-active" : ""}`}>
            {/* Slide 1 is the LCP image (server-rendered, high priority). The
                others are only requested after hydration, one slide ahead. */}
            {(index === 0 || (hydrated && index <= heroIndex + 1)) && (
              <img
                className="hero-slide__img"
                src={url}
                srcSet={heroSrcSet(url)}
                sizes="100vw"
                alt=""
                width={1600}
                height={1067}
                decoding={index === 0 ? "sync" : "async"}
                loading={index === 0 ? "eager" : "lazy"}
                {...{ fetchpriority: index === 0 ? "high" : "low" }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="hero__overlay" />
      <div className="container hero__content">
        <h1>{h1 ?? t("heroTitle")}</h1>
        <p>{t("heroSubtitle")}</p>
        <a className="hero__btn" href="#vlastni" onClick={onNavClick}>
          {t("heroBtn")}
        </a>
      </div>

      <div className="container hero-search-wrap">
        <form id="heroSearch" className="hero-search" onSubmit={onSearchSubmit}>
          <div className="hero-search__fields hero-search__fields--three">
            <div className="hero-search__item">
              <label htmlFor="searchDestination">{t("searchWhere")}</label>
              <div className="hero-search__control">
                <input
                  id="searchDestination"
                  ref={searchDestinationRef}
                  type="text"
                  placeholder={t("searchPlaceholder")}
                />
                <span className="hero-search__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" />
                    <circle cx="12" cy="9" r="2.6" />
                  </svg>
                </span>
              </div>
            </div>
            <div
              className="hero-search__item"
              style={{ position: "relative", cursor: "pointer" }}
              onClick={onDateToggle}
            >
              <label style={{ pointerEvents: "none" }}>{t("searchDate")}</label>
              <div className="hero-search__control">
                <input
                  id="searchDate"
                  type="text"
                  value={displayDate}
                  readOnly
                  style={{ pointerEvents: "none" }}
                />
                <span className="hero-search__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                  </svg>
                </span>
              </div>
              {isDatePickerOpen && (
                <div className="search-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="popover-row">
                    <label>{t("searchDeparture")}</label>
                    <input
                      type="date"
                      value={searchDateStart}
                      onChange={(e) => onDateChange("start", e.target.value)}
                    />
                  </div>
                  <div className="popover-row">
                    <label>{t("searchReturn")}</label>
                    <input
                      type="date"
                      value={searchDateEnd}
                      onChange={(e) => onDateChange("end", e.target.value)}
                    />
                  </div>
                  <button type="button" className="popover-done" onClick={onDateToggle}>
                    {t("searchDone")}
                  </button>
                </div>
              )}
            </div>
            <div className="hero-search__item">
              <label htmlFor="searchTransport">{t("searchTransport")}</label>
              <div className="hero-search__control">
                <select id="searchTransport" ref={searchTransportRef}>
                  <option value="">{t("transportAny")}</option>
                  <option value="plane">{t("transportFlight")}</option>
                  <option value="bus">{t("transportBus")}</option>
                  <option value="car">{t("transportOwn")}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="hero-search__footer">
            <button type="submit">{t("searchBtn")}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
