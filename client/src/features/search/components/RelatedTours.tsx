import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { formatPrice } from "../../../utils";
import { isPlausibleTourPrice } from "../../../lib/prices";

interface Props {
  tours: UnifiedTour[];
  currentTourId: string;
  onSelect: (tour: UnifiedTour) => void;
  t: (key: TranslationKey) => string;
}

export function RelatedTours({ tours, currentTourId, onSelect }: Props) {
  const related = tours
    .filter((tour) => `${tour.source}-${tour.externalId}` !== currentTourId)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="related-tours">
      <h3 className="related-tours__title">Podobné zájezdy</h3>
      <div className="related-tours__grid">
        {related.map((tour) => (
          <button
            key={`${tour.source}-${tour.externalId}`}
            type="button"
            className="related-tours__card"
            onClick={() => onSelect(tour)}
          >
            <img
              src={tour.image || "/placeholder-tour.svg"}
              alt={tour.title}
              loading="lazy"
              decoding="async"
              className="related-tours__image"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
              }}
            />
            <div className="related-tours__info">
              <span className="related-tours__destination">{tour.destination}</span>
              <span className="related-tours__card-title">{tour.title}</span>
              {isPlausibleTourPrice(tour.price) && (
                <strong className="related-tours__price">{formatPrice(tour.price)}</strong>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
