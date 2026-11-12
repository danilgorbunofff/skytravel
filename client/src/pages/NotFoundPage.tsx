import SiteHeader from "../components/SiteHeader";
import { AppFooter } from "../components/AppFooter";
import { useLanguage } from "../hooks/useLanguage";
import { StickyTelegram } from "../components/public/StickyTelegram";
import { publicStrings } from "../components/public/strings";
import { localePath, type PublicLocale } from "../i18n/locales";
import "../site.css";
import "../public.css";

export default function NotFoundPage({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
  const { t } = useLanguage();
  return (
    <div className="pub-page">
      <SiteHeader />
      <main id="main-content" className="pub-main">
        <section className="pub-hero">
          <div className="container">
            <h1 className="pub-h1">{s.notFoundTitle}</h1>
            <p className="pub-hero__intro">{s.notFoundText}</p>
            <p>
              <a className="pub-btn pub-btn--primary" href={localePath(lang)}>
                {s.notFoundBack}
              </a>
            </p>
          </div>
        </section>
      </main>
      <AppFooter t={t} />
      <StickyTelegram lang={lang} />
    </div>
  );
}
