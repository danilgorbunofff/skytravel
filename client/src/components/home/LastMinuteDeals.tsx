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

function LastMinuteSkeleton() {
  return (
    <div className="last-row" aria-hidden="true">
      <div>
        <Skeleton className="mb-1 h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div>
        <Skeleton className="mb-1 h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div>
        <Skeleton className="h-6 w-20" />
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
      return Array.from({ length: 3 }).map((_, i) => (
        <LastMinuteSkeleton key={i} />
      ));
    }
    if (lastMinuteItems.length === 0) {
      return <EmptyState title={t("emptyState")} />;
    }
    return lastMinuteItems.map((item) => {
      const starsNum = Number(item.stars) || 0;
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      return (
        <article
          key={item.externalId}
          className="last-row"
          onClick={() => onItemClick(item)}
        >
          <div>
            <h4>{item.title}</h4>
            <p>{item.destination}</p>
          </div>
          <div>
            <p>
              {startDate.toLocaleDateString("cs-CZ")} –{" "}
              {endDate.toLocaleDateString("cs-CZ")}
            </p>
            <p>
              {starsNum > 0
                ? "\u2605".repeat(starsNum) + "\u2606".repeat(5 - starsNum)
                : ""}
            </p>
          </div>
          <div>
            <strong>
              {t("from")} {formatPrice(item.price)}
            </strong>
          </div>
        </article>
      );
    });
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
          <div id="lastMinuteList" className="last-minute-list">
            {renderList()}
          </div>
        </article>
      </div>
    </section>
  );
}
