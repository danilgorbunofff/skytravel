import type { AlexandriaLastMinuteItem } from "../../api";
import type { TranslationKey } from "../../hooks/useLanguage";
import { formatPrice } from "../../utils";
import { EmptyState } from "../EmptyState";
import { Skeleton } from "../Skeleton";

interface Props {
  lastMinuteItems: AlexandriaLastMinuteItem[];
  loading?: boolean;
  onItemClick: (item: AlexandriaLastMinuteItem) => void;
  t: (key: TranslationKey) => string;
}

/** Inline SVG fallback when a hotel image is missing or broken */
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'%3E%3Crect fill='%23eef1f6' width='400' height='240'/%3E%3Ctext fill='%239aa4b8' font-family='Manrope,sans-serif' font-size='16' font-weight='600' text-anchor='middle' x='200' y='120'%3ESkyTravel%3C/text%3E%3Ctext fill='%23bcc5d4' font-family='Manrope,sans-serif' font-size='12' text-anchor='middle' x='200' y='142'%3EHotel photo%3C/text%3E%3C/svg%3E";

/** Format start/end ISO date strings as compact "DD.MM. – DD.MM." */
function formatRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
    return `${fmt(s)} – ${fmt(e)}`;
  } catch {
    return "";
  }
}

function LastMinuteSkeleton() {
  return (
    <div className="hotel-card" aria-hidden="true">
      <Skeleton className="h-[120px] w-full rounded-none" />
      <div className="hotel-card__body">
        <div className="hotel-topline">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="mt-1 h-5 w-3/4" />
        <Skeleton className="mt-0.5 h-4 w-1/2" />
        <Skeleton className="mt-2 h-3 w-2/3" />
        <Skeleton className="mt-auto h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function LastMinuteDeals({
  lastMinuteItems,
  loading,
  onItemClick,
  t,
}: Props) {
  function renderList() {
    if (loading) {
      return (
        <div className="last-minute-grid" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <LastMinuteSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (lastMinuteItems.length === 0) {
      return <EmptyState title={t("emptyState")} />;
    }
    return (
      <div className="last-minute-grid">
        {lastMinuteItems.slice(0, 4).map((item) => {
          const starsNum = Number(item.stars) || 0;
          const hasOriginalPrice =
            item.originalPrice > 0 && item.originalPrice > item.price;
          return (
            <article
              key={item.externalId}
              className="hotel-card"
              role="button"
              tabIndex={0}
              onClick={() => onItemClick(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onItemClick(item);
                }
              }}
            >
              <img
                src={item.image || FALLBACK_IMG}
                alt={item.title}
                loading="lazy"
                decoding="async"
                width={400}
                height={240}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src !== FALLBACK_IMG) {
                    el.src = FALLBACK_IMG;
                    el.classList.add("hotel-card__img-fallback");
                  }
                }}
              />

              <div className="hotel-card__body">
                <div className="hotel-topline">
                  <span
                    className="stars"
                    aria-label={
                      starsNum > 0
                        ? `${starsNum} out of 5 stars`
                        : undefined
                    }
                  >
                    {starsNum > 0
                      ? "\u2605".repeat(starsNum) +
                        "\u2606".repeat(5 - starsNum)
                      : ""}
                  </span>
                  {item.board ? (
                    <span className="hotel-board-badge">{item.board}</span>
                  ) : null}
                </div>

                <h3 title={item.title}>{item.title}</h3>

                <p className="hotel-meta" title={item.destination}>
                  {item.destination}
                </p>

                <div className="hotel-info">
                  <div className="hotel-line">
                    <span>
                      {formatRange(item.startDate, item.endDate)}
                    </span>
                  </div>
                  {item.transport ? (
                    <div className="hotel-line">
                      <span>{item.transport}</span>
                    </div>
                  ) : null}
                </div>

                <div className="hotel-price">
                  {t("from")} {formatPrice(item.price)}
                  {hasOriginalPrice ? (
                    <span className="hotel-price__original">
                      {formatPrice(item.originalPrice)}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <section id="lastminute" className="section section-soft">
      <div className="container dual-blocks">
        <article className="stats-card">
          <h3>{t("sectionTodayTitle")}</h3>
          <div className="stats-card__inner">
            <img
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80"
              alt="Background"
              loading="lazy"
              decoding="async"
              width={1200}
              height={800}
            />
            <div>
              <p>
                <strong>{t("sectionToday1")}</strong> {t("sectionToday1b")}
              </p>
              <p>
                <strong>{t("sectionToday2")}</strong> {t("sectionToday2b")}
              </p>
              <p className="stats-note">{t("sectionTodayNote")}</p>
            </div>
          </div>
        </article>

        <article className="last-minute-card">
          <h3>{t("sectionLastMinute")}</h3>
          {renderList()}
        </article>
      </div>
    </section>
  );
}
