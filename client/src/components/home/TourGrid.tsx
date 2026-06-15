import type { OwnTour } from "../../data";
import type { TranslationKey } from "../../hooks/useLanguage";
import TourCard from "../TourCard";
import { TourCardSkeleton } from "../TourCardSkeleton";
import { EmptyState } from "../EmptyState";
import { ErrorMessage } from "../ErrorMessage";

interface Props {
  ownTours: OwnTour[];
  loading?: boolean;
  error?: string | null;
  onTourClick: (tour: OwnTour) => void;
  t: (key: TranslationKey) => string;
}

export default function TourGrid({ ownTours, loading, error, onTourClick, t }: Props) {
  if (error) {
    return (
      <section id="vlastni" className="section section-white">
        <div className="container">
          <ErrorMessage message={error} />
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section id="vlastni" className="section section-white">
        <div className="container">
          <header className="section-head">
            <h2>{t("sectionOwnTitle")}</h2>
            <p className="section-subtitle">{t("sectionOwnSub")}</p>
          </header>
          <div className="destination-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (ownTours.length === 0) {
    return (
      <section id="vlastni" className="section section-white">
        <div className="container">
          <EmptyState title={t("emptyState")} />
        </div>
      </section>
    );
  }

  return (
    <section id="vlastni" className="section section-white">
      <div className="container">
        <header className="section-head">
          <h2>{t("sectionOwnTitle")}</h2>
          <p className="section-subtitle">{t("sectionOwnSub")}</p>
        </header>
        <div id="ownGrid" className="destination-grid">
          {ownTours.map((tour) => (
            <TourCard
              key={`${tour.id ?? tour.destination}`}
              tour={tour}
              onClick={() => onTourClick(tour)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
