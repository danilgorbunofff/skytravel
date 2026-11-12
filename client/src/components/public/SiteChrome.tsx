import { useState } from "react";
import { SITE } from "../../config/site";
import { localePath, type PublicLocale } from "../../i18n/locales";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { publicStrings } from "./strings";

interface HeaderProps {
  lang: PublicLocale;
  alternates?: Partial<Record<PublicLocale, string>>;
}

const LAST_MINUTE_PATH: Record<PublicLocale, string> = {
  cs: "/cs/last-minute/",
  ru: "/ru/goryashchie-tury/",
};

/** Header for landing / 404 pages (the home page keeps its own richer header). */
export function SiteHeader({ lang, alternates }: HeaderProps) {
  const s = publicStrings(lang);
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-top">
        <a className="logo" href={localePath(lang)} aria-label={`${SITE.name} — ${s.home}`}>
          <span className="logo__sky">Sky</span>
          <span className="logo__travel">Travel</span>
        </a>
        <div className="header-contact-wrap desktop-only">
          <div className="header-contact">
            <a href={`tel:${SITE.phone.replace(/\s+/g, "")}`}>{SITE.phone}</a>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </div>
          <LanguageSwitcher lang={lang} alternates={alternates} />
        </div>
        <div className="mobile-header-actions mobile-only">
          <LanguageSwitcher lang={lang} alternates={alternates} />
          <button
            type="button"
            className="hamburger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
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
          </button>
        </div>
      </div>
      <div className={`site-nav-wrapper ${open ? "is-open" : ""}`}>
        <div className="container site-nav-inner">
          <nav className="main-nav">
            <a href={localePath(lang)}>{s.home}</a>
            <a href={LAST_MINUTE_PATH[lang]}>{s.lastMinute}</a>
            <a href="/search">{s.search}</a>
            <a href="/blog">{s.footerBlog}</a>
            <a href="#kontakt">{s.contact}</a>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
  return (
    <footer id="kontakt" className="footer">
      <div className="container footer-main">
        <div>
          <h2 className="footer-heading">{SITE.name}</h2>
          <p>
            {SITE.address.streetAddress}, {SITE.address.addressLocality}
          </p>
        </div>
        <div>
          <h2 className="footer-heading">{s.contact}</h2>
          <p>
            <a href={`tel:${SITE.phone.replace(/\s+/g, "")}`}>{SITE.phone}</a>
          </p>
          <p>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
          <p>
            <a
              href={SITE.telegramContactUrl}
              target="_blank"
              rel="noopener"
              data-track-location="footer"
            >
              {s.writeTelegram}
            </a>
          </p>
        </div>
        <div>
          <h2 className="footer-heading">{s.popularTitle}</h2>
          <p>
            <a href={LAST_MINUTE_PATH[lang]}>{s.lastMinute}</a>
          </p>
          <p>
            <a href={lang === "ru" ? "/ru/egipet/" : "/cs/egypt/"}>
              {lang === "ru" ? "Египет" : "Egypt"}
            </a>
          </p>
          <p>
            <a href="/blog">{s.footerBlog}</a>
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <a href="/gdpr" className="footer-bottom__link">
          {s.footerGdpr}
        </a>
        <a href="/terms" className="footer-bottom__link">
          {s.footerTerms}
        </a>
        <span>
          &copy; {new Date().getFullYear()} {SITE.name}. {s.footerRights}
        </span>
      </div>
    </footer>
  );
}
