import { memo } from "react";
import { formatPrice } from "../utils";
import { useLanguage } from "../hooks/useLanguage";
import type { OwnTour } from "../data";

type Props = {
  tour: OwnTour;
  onClick: () => void;
};

export default memo(function TourCard({ tour, onClick }: Props) {
  const { lang, t } = useLanguage();

  return (
    <article className="destination-card" onClick={onClick}>
      <img
        className="destination-card__bg"
        src={tour.image || "/placeholder-tour.svg"}
        alt={tour.i18n?.[lang]?.destination || tour.destination}
        loading="lazy"
        decoding="async"
        width={640}
        height={400}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.fallback) {
            img.dataset.fallback = "1";
            img.src = "/placeholder-tour.svg";
          }
        }}
      />
      <div className="destination-card__body">
        <h3>{tour.i18n?.[lang]?.destination || tour.destination}</h3>
        <div className="destination-card__meta">
          <span className="price-pill">
            {t("from")} {formatPrice(tour.price)}
          </span>
        </div>
      </div>
    </article>
  );
});
