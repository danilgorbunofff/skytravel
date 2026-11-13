import { memo } from "react";
import { Link } from "react-router-dom";
import { useLanguage, type TranslationKey } from "../hooks/useLanguage";
import { DEFAULT_LOCALE, isPublicLocale, localePath } from "../i18n/locales";

interface Props {
  t: (key: TranslationKey) => string;
  /** Where "Send an inquiry" points. Pages with their own lead form pass "#poptavka". */
  inquiryHref?: string;
}

function AppFooterComponent({ t, inquiryHref }: Props) {
  const { lang } = useLanguage();
  const href =
    inquiryHref ?? `${localePath(isPublicLocale(lang) ? lang : DEFAULT_LOCALE)}#poptavka`;

  return (
    <footer id="kontakt" className="footer">
      <div className="container footer-main">
        <div>
          <h2 className="footer-heading">{t("footerCity")}</h2>
          <p>SkyTravel</p>
          <p>Křižíkova 6, Praha</p>
          <p>IČO: 23973099</p>
          <p>
            <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
          </p>
          <p>{t("footerHours")}</p>
          <p className="footer-note">{t("footerInsured")}</p>
        </div>
        {/* One way to get offers: the inquiry form (the old newsletter box sent nothing). */}
        <div className="footer-inquiry">
          <h2 className="footer-heading">{t("footerInquiryTitle")}</h2>
          <p>{t("footerInquiryText")}</p>
          {href.startsWith("#") ? (
            <a className="footer-cta" href={href}>
              {t("sInquiryCta")}
            </a>
          ) : (
            <Link className="footer-cta" to={href}>
              {t("sInquiryCta")}
            </Link>
          )}
        </div>
      </div>

      <div className="container footer-bottom">
        <a href="#kontakt" className="footer-bottom__link">
          {t("navContact")}
        </a>
        <a href="/blog/" className="footer-bottom__link">
          Blog
        </a>
        <Link to="/gdpr" className="footer-bottom__link">
          {t("footerGdpr")}
        </Link>
        <Link to="/terms" className="footer-bottom__link">
          {t("footerTerms")}
        </Link>
        <span>
          &copy; <span>{new Date().getFullYear()}</span> SkyTravel
        </span>
      </div>
    </footer>
  );
}

export const AppFooter = memo(AppFooterComponent);
