import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useLanguage, type LanguageKey } from "../hooks/useLanguage";
import { useAdminAuth } from "../hooks/useAdminAuth";
import "../site.css";

const LANGS: { code: LanguageKey; flag: string; label: string }[] = [
  { code: "cs", flag: "🇨🇿", label: "Přepnout do češtiny" },
  { code: "uk", flag: "🇺🇦", label: "Перейти на українську" },
  { code: "en", flag: "🇬🇧", label: "Switch to English" },
  { code: "ru", flag: "🇷🇺", label: "Переключить на русский" },
];

interface SiteHeaderProps {
  /** Top-search form rendered inside header-top; pass null to show placeholder slot. */
  topSearch?: React.ReactNode;
}

export default function SiteHeader({ topSearch }: SiteHeaderProps) {
  const { lang, setLang, t } = useLanguage();
  const { isAdmin } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="container header-top">
        <Link className="logo" to="/" aria-label="SkyTravel — domů" onClick={closeMenu}>
          <span className="logo__sky">Sky</span>
          <span className="logo__travel">Travel</span>
        </Link>

        {topSearch ?? (
          <div className="top-search" aria-hidden="true" style={{ visibility: "hidden" }} />
        )}

        {/* Desktop Right Side */}
        <div className="header-contact-wrap desktop-only">
          <div className="header-contact">
            <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
          </div>
          <div className="lang-toggle" aria-label="Language switcher">
            {LANGS.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`lang-btn${lang === item.code ? " is-active" : ""}`}
                onClick={() => setLang(item.code)}
                aria-label={item.label}
                aria-pressed={lang === item.code}
              >
                {item.flag}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Right Side */}
        <div className="mobile-header-actions mobile-only">
          <div className="lang-toggle" aria-label="Language switcher">
            {LANGS.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`lang-btn${lang === item.code ? " is-active" : ""}`}
                onClick={() => setLang(item.code)}
                aria-label={item.label}
                aria-pressed={lang === item.code}
              >
                {item.flag}
              </button>
            ))}
          </div>
          <button
            className="hamburger"
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
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
      <div className={`site-nav-wrapper ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="container site-nav-inner">
          <div className="header-contact mobile-only mobile-contact">
            <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
          </div>
          <nav className="main-nav" aria-label="Hlavní navigace">
            <NavLink
              to="/"
              end
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              {t("navHome")}
            </NavLink>
            <NavLink
              to="/search"
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              {t("navSearch")}
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
              >
                {t("navAdmin")}
              </NavLink>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
