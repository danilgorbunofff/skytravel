import { useContext, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useFavorites } from "../hooks/useFavorites";
import { LocaleContext } from "../i18n/localeContextValue";
import { DEFAULT_LOCALE, isPublicLocale, localePath, type PublicLocale } from "../i18n/locales";
import { AppLanguageSwitcher, LanguageSwitcher } from "./public/LanguageSwitcher";
import { publicStrings } from "./public/strings";
import "../site.css";

interface SiteHeaderProps {
  /** Optional search form shown in the header row (home, once the hero search is out of view). */
  topSearch?: React.ReactNode;
  /** On /cs/… and /ru/… pages: the same page in the other language (for the switcher). */
  alternates?: Partial<Record<PublicLocale, string>>;
}

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "is-active" : undefined);

function lastMinuteSearchHref(): string {
  const day = 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return `/search?dateStart=${iso(Date.now())}&dateEnd=${iso(Date.now() + 14 * day)}`;
}

export default function SiteHeader({ topSearch, alternates }: SiteHeaderProps) {
  const { lang, t } = useLanguage();
  const { pathname } = useLocation();
  // URL-localized pages switch language by URL (crawlable links); the rest switch in place.
  const locale = useContext(LocaleContext)?.lang ?? null;
  const siteLocale: PublicLocale = locale ?? (isPublicLocale(lang) ? lang : DEFAULT_LOCALE);
  const homePath = localePath(siteLocale);
  // Czech and Russian have a Last minute landing page; Ukrainian and English stay in their
  // own language on the search page, using the same "next 14 days" window as its preset.
  const lastMinutePage = publicStrings(siteLocale).lastMinutePath;
  const lastMinuteHref = locale || isPublicLocale(lang) ? lastMinutePage : lastMinuteSearchHref();
  const lastMinuteActive = pathname.replace(/\/?$/, "/") === lastMinutePage;
  const langToggle = locale ? (
    <LanguageSwitcher lang={locale} alternates={alternates} />
  ) : (
    <AppLanguageSwitcher />
  );
  const { isAdmin } = useAdminAuth();
  const { favorites } = useFavorites();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="container header-top">
        <Link className="logo" to={homePath} aria-label="SkyTravel — domů" onClick={closeMenu}>
          <span className="logo__sky">Sky</span>
          <span className="logo__travel">Travel</span>
        </Link>

        {topSearch}

        {/* Desktop Right Side */}
        <div className="header-contact-wrap desktop-only">
          <div className="header-contact">
            <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
          </div>
          {langToggle}
        </div>

        {/* Mobile Right Side */}
        <div className="mobile-header-actions mobile-only">
          {langToggle}
          <button
            className="hamburger"
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t("navMenu")}
            aria-expanded={mobileMenuOpen}
            aria-controls="site-nav"
          >
            {mobileMenuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Nav bar / Mobile Drawer */}
      <div id="site-nav" className={`site-nav-wrapper ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="container site-nav-inner">
          <div className="header-contact mobile-only mobile-contact">
            <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
          </div>
          <nav className="main-nav" aria-label={t("navMainLabel")}>
            <NavLink to={homePath} end onClick={closeMenu} className={navClass}>
              {t("navHome")}
            </NavLink>
            <a
              href={lastMinuteHref}
              onClick={closeMenu}
              className={lastMinuteActive ? "is-active" : undefined}
              aria-current={lastMinuteActive ? "page" : undefined}
            >
              {t("navLastMinute")}
            </a>
            <NavLink to="/search" end onClick={closeMenu} className={navClass}>
              {t("navSearch")}
            </NavLink>
            <NavLink to="/favorites" onClick={closeMenu} className={navClass}>
              {t("navFavorites")}
              {favorites.length > 0 && <span className="main-nav__count">{favorites.length}</span>}
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" onClick={closeMenu} className={navClass}>
                {t("navAdmin")}
              </NavLink>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
