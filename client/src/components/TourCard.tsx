import { formatPrice } from "../utils";
import { useLanguage } from "../hooks/useLanguage";
import type { OwnTour } from "../data";

type Props = {
  tour: OwnTour;
  onClick: () => void;
};

export default function TourCard({ tour, onClick }: Props) {
  const { lang, t } = useLanguage();

  return (
    <article
      className="destination-card"
      style={{ backgroundImage: `url('${tour.image}')` }}
      onClick={onClick}
    >
      <div className="destination-card__body">
        <h3>{tour.i18n?.[lang]?.destination || tour.destination}</h3>
        <div className="destination-card__meta">
          <span className="own-badge">{tour.i18n?.[lang]?.title || tour.title}</span>
          <span className="price-pill">{t("from")} {formatPrice(tour.price)}</span>
        </div>
      </div>
    </article>
  );
}
