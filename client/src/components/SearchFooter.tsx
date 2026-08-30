import { memo } from "react";
import { Link } from "react-router-dom";
import type { TranslationKey } from "../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
}

function SearchFooterComponent({ t }: Props) {
  return (
    <footer className="search-footer" aria-label="Footer">
      <div className="container search-footer__main">
        <div className="search-footer__brand">
          <strong>SkyTravel</strong>
          <span> · Křižíkova 6, Praha · {t("footerHours")}</span>
        </div>
        <div className="search-footer__contact">
          <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
        </div>
        <nav className="search-footer__nav" aria-label="Legal">
          <Link to="/gdpr">{t("footerGdpr")}</Link>
          <Link to="/terms">{t("footerTerms")}</Link>
        </nav>
      </div>
      <div className="container search-footer__bottom">
        <span>© {new Date().getFullYear()} SkyTravel</span>
        <span className="search-footer__note">{t("sFooterNote")}</span>
      </div>
    </footer>
  );
}

export const SearchFooter = memo(SearchFooterComponent);
