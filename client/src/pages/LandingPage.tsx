import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DealsBlock } from "../components/public/DealsBlock";
import { LeadForm } from "../components/public/LeadForm";
import { SiteFooter, SiteHeader } from "../components/public/SiteChrome";
import { StickyTelegram } from "../components/public/StickyTelegram";
import { TelegramChannelBlock } from "../components/public/TelegramChannelBlock";
import { TrustBlock } from "../components/public/TrustBlock";
import { TelegramIcon } from "../components/public/TelegramIcon";
import { publicStrings } from "../components/public/strings";
import { SkipToContent } from "../components/SkipToContent";
import { SITE } from "../config/site";
import { localeFromPath, slugFromPath, DEFAULT_LOCALE, type PublicLocale } from "../i18n/locales";
import { useSsrData } from "../ssr/SsrDataContext";
import type { LandingPageData } from "../ssr/types";
import type { UnifiedTour } from "../types/providers";
import NotFoundPage from "./NotFoundPage";
import "../site.css";
import "../public.css";

const API_URL = import.meta.env.VITE_API_URL || "";

type LoadState =
  | { status: "ready"; page: LandingPageData; deals?: UnifiedTour[] }
  | { status: "loading" }
  | { status: "missing" };

/**
 * Landing page template (/cs/<slug>/, /ru/<slug>/…). Content comes from
 * server/content/pages/<lang>/<slug>.md — see README "Adding a landing page".
 */
export default function LandingPage() {
  const { pathname } = useLocation();
  const lang: PublicLocale = localeFromPath(pathname) ?? DEFAULT_LOCALE;
  const slug = slugFromPath(pathname);
  const ssr = useSsrData();

  const fromSsr =
    ssr?.page === "landing" && ssr.landing && ssr.path === pathname
      ? ({ status: "ready", page: ssr.landing, deals: ssr.deals } as const)
      : ssr?.page === "notFound" && ssr.path === pathname
        ? ({ status: "missing" } as const)
        : null;

  const [state, setState] = useState<LoadState>(fromSsr ?? { status: "loading" });

  // Client-side fallback (dev server or client-side navigation).
  useEffect(() => {
    if (fromSsr) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`${API_URL}/api/pages/${lang}/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { page: LandingPageData };
        if (!cancelled) setState({ status: "ready", page: data.page });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "missing" });
      });
    return () => {
      cancelled = true;
    };
    // fromSsr is derived from the same pathname; re-run only on navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, slug]);

  useEffect(() => {
    if (state.status === "ready") document.title = state.page.title;
  }, [state]);

  if (state.status === "missing") return <NotFoundPage lang={lang} />;
  if (state.status === "loading") {
    return (
      <div className="pub-page">
        <SiteHeader lang={lang} />
        <main id="main-content" className="pub-main" aria-busy="true" />
      </div>
    );
  }

  return <LandingView page={state.page} deals={state.deals} />;
}

function LandingView({ page, deals }: { page: LandingPageData; deals?: UnifiedTour[] }) {
  const { lang } = page;
  const s = publicStrings(lang);
  const crumbs = page.breadcrumbs;

  return (
    <div className="pub-page">
      <SkipToContent />
      <SiteHeader lang={lang} alternates={page.alternates} />

      <main id="main-content" className="pub-main">
        <section className="pub-hero">
          <div className="container">
            <nav aria-label={s.breadcrumbs} className="pub-breadcrumbs">
              <ol>
                {crumbs.map((crumb, i) => (
                  <li key={crumb.href}>
                    {i < crumbs.length - 1 ? (
                      <a href={crumb.href}>{crumb.label}</a>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <h1 className="pub-h1">{page.h1}</h1>
            {page.intro && <p className="pub-hero__intro">{page.intro}</p>}
            <div className="pub-hero__ctas">
              <a href="#poptavka" className="pub-btn pub-btn--primary">
                {s.leadSubmit}
              </a>
              <a
                className="pub-btn pub-btn--tg"
                href={SITE.telegramContactUrl}
                target="_blank"
                rel="noopener"
                data-track-location="landing_hero"
              >
                <TelegramIcon />
                {s.writeTelegram}
              </a>
            </div>
          </div>
        </section>

        <DealsBlock
          lang={lang}
          query={{ destinationSlug: page.deals.destinationSlug, lastMinute: page.deals.lastMinute }}
          searchHref={page.deals.searchHref}
          initialDeals={deals}
        />

        <section className="pub-section">
          <div
            className="container pub-content"
            dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
          />
        </section>

        {page.faq.length > 0 && (
          <section className="pub-section pub-faq" aria-labelledby="pub-faq-title">
            <div className="container">
              <h2 id="pub-faq-title" className="pub-h2">
                {s.faqTitle}
              </h2>
              {page.faq.map((item) => (
                <details key={item.q} className="pub-faq__item">
                  <summary>
                    <h3>{item.q}</h3>
                  </summary>
                  <div dangerouslySetInnerHTML={{ __html: item.a }} />
                </details>
              ))}
            </div>
          </section>
        )}

        <section
          id="poptavka"
          className="pub-section pub-lead-section"
          aria-labelledby="pub-lead-title"
        >
          <div className="container">
            <h2 id="pub-lead-title" className="pub-h2">
              {s.leadTitle}
            </h2>
            <p className="pub-muted">{s.leadSubtitle}</p>
            <LeadForm lang={lang} defaultDestination={page.formDestination} location="landing" />
          </div>
        </section>

        <TrustBlock lang={lang} />
        <TelegramChannelBlock lang={lang} />

        {page.related.length > 0 && (
          <section className="pub-section" aria-labelledby="pub-related-title">
            <div className="container">
              <h2 id="pub-related-title" className="pub-h2">
                {s.relatedTitle}
              </h2>
              <ul className="pub-related">
                {page.related.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <SiteFooter lang={lang} />
      <StickyTelegram lang={lang} />
    </div>
  );
}
