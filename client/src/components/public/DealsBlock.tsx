import { useEffect, useMemo, useState } from "react";
import { fetchPublicAllProviderTours } from "../../api/publicProviders";
import { SITE } from "../../config/site";
import { TourDetailModal } from "../../features/search/components/TourDetailModal";
import type { PublicLocale } from "../../i18n/locales";
import { track } from "../../lib/analytics";
import { dealFilters, type DealQuery } from "../../lib/dealFilters";
import type { UnifiedTour } from "../../types/providers";
import { publicStrings } from "./strings";
import { TelegramIcon } from "./TelegramIcon";

interface Props {
  lang: PublicLocale;
  query: DealQuery;
  searchHref: string;
  /** Server-rendered offers; `undefined` means "not provided — fetch on the client". */
  initialDeals?: UnifiedTour[];
  title?: string;
}

const FALLBACK_IMG = "/placeholder-tour.svg";
const priceFmt = new Intl.NumberFormat("cs-CZ");

function formatDates(start: string, end: string, lang: PublicLocale): string {
  const locale = lang === "ru" ? "ru-RU" : "cs-CZ";
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "numeric",
    timeZone: "Europe/Prague",
  };
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  return `${a.toLocaleDateString(locale, opts)} – ${b.toLocaleDateString(locale, opts)}`;
}

/** Live offers filtered for a landing page. Rendered on the server, refreshed never (cache is 5 min server-side). */
export function DealsBlock({ lang, query, searchHref, initialDeals, title }: Props) {
  const s = publicStrings(lang);
  const [deals, setDeals] = useState<UnifiedTour[]>(initialDeals ?? []);
  const [loading, setLoading] = useState(initialDeals === undefined);
  const [selected, setSelected] = useState<UnifiedTour | null>(null);

  const { destinationSlug, lastMinute } = query;
  useEffect(() => {
    if (initialDeals !== undefined) return;
    const controller = new AbortController();
    fetchPublicAllProviderTours(dealFilters({ destinationSlug, lastMinute }), controller.signal)
      .then((result) => setDeals(result.items ?? []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [initialDeals, destinationSlug, lastMinute]);

  const related = useMemo(
    () => (selected ? deals.filter((d) => d.externalId !== selected.externalId) : []),
    [deals, selected],
  );

  function open(deal: UnifiedTour) {
    track("deal_click", {
      deal_id: deal.externalId,
      deal_destination: deal.destination,
      value: deal.price,
      currency: "CZK",
      click_location: "landing_deals",
    });
    setSelected(deal);
  }

  return (
    <section className="pub-section pub-deals" aria-labelledby="pub-deals-title">
      <div className="container">
        <h2 id="pub-deals-title" className="pub-h2">
          {title ?? s.dealsTitle}
        </h2>

        {loading ? (
          <div className="pub-deals__grid" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pub-deal pub-deal--skeleton" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="pub-deals__empty">
            <p>{s.dealsEmpty}</p>
            <a
              className="pub-btn pub-btn--tg"
              href={SITE.telegramContactUrl}
              target="_blank"
              rel="noopener"
              data-track-location="deals_empty"
            >
              <TelegramIcon />
              {s.writeTelegram}
            </a>
          </div>
        ) : (
          <ul className="pub-deals__grid">
            {deals.map((deal) => (
              <li key={`${deal.source}-${deal.externalId}`}>
                <article className="pub-deal">
                  <img
                    src={deal.image || FALLBACK_IMG}
                    alt={`${deal.title} — ${deal.destination}`}
                    width={400}
                    height={260}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="pub-deal__body">
                    <h3>{deal.title}</h3>
                    <p className="pub-deal__meta">
                      {deal.destination}
                      {deal.board ? ` · ${deal.board}` : ""}
                    </p>
                    <p className="pub-deal__meta">
                      {formatDates(deal.startDate, deal.endDate, lang)}
                    </p>
                    <p className="pub-deal__price">
                      {s.dealsFrom} <strong>{priceFmt.format(deal.price)} Kč</strong> {s.perPerson}
                    </p>
                    <button
                      type="button"
                      className="pub-btn pub-btn--primary"
                      onClick={() => open(deal)}
                    >
                      Detail
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        <p className="pub-deals__more">
          <a href={searchHref} className="pub-link">
            {s.dealsAll} →
          </a>
        </p>
      </div>

      {selected && (
        <TourDetailModal
          tour={selected}
          providerLabel="Alexandria"
          offers={[selected]}
          loading={false}
          relatedTours={related}
          onClose={() => setSelected(null)}
          onNavigateToTour={(tour) => setSelected(tour)}
        />
      )}
    </section>
  );
}
