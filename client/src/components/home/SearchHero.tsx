import type { Ref } from "react";
import type { TranslationKey } from "../../hooks/useLanguage";

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
}: Props) {
  const dateLocale = lang === "en" ? "en-US" : "cs-CZ";
  const displayDate = `${new Date(searchDateStart).toLocaleDateString(dateLocale)} – ${new Date(searchDateEnd).toLocaleDateString(dateLocale)}`;

  return (
    <section id="home" className="hero">
      <div id="heroCarousel" className="hero-carousel" aria-hidden="true">
        {heroImages.map((url, index) => (
          <img
            key={url}
            className={`hero-slide${index === heroIndex ? " is-active" : ""}`}
            src={url}
            alt=""
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : undefined}
            decoding="async"
          />
        ))}
      </div>
      <div className="hero__overlay" />
      <div className="container hero__content">
        <h1>{t("heroTitle")}</h1>
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
                <span className="hero-search__icon">📍</span>
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
                <span className="hero-search__icon">📅</span>
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
                <span className="hero-search__icon">✈</span>
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
