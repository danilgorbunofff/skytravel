import { Link } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { usePageTitle } from "../hooks/usePageTitle";
import SiteHeader from "../components/SiteHeader";
import { SkipToContent } from "../components/SkipToContent";
import { AppFooter } from "../components/AppFooter";
import "../site.css";

export default function NotFoundPage() {
  const { t } = useLanguage();
  usePageTitle(t("notFoundTitle"));

  return (
    <>
      <SkipToContent />
      <SiteHeader />
      <main id="main-content" className="notfound-page">
        <div className="container notfound-page__inner">
          <p className="notfound-page__code" aria-hidden="true">
            404
          </p>
          <h1>{t("notFoundTitle")}</h1>
          <p className="notfound-page__text">{t("notFoundText")}</p>
          <div className="notfound-page__actions">
            <Link to="/search" className="notfound-page__btn notfound-page__btn--primary">
              {t("navSearch")}
            </Link>
            <Link to="/" className="notfound-page__btn">
              {t("notFoundHome")}
            </Link>
          </div>
        </div>
      </main>
      <AppFooter t={t} />
    </>
  );
}
