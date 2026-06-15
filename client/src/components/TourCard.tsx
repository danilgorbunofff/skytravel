import { memo, useEffect, useRef, useState } from "react";
import { formatPrice } from "../utils";
import { useLanguage } from "../hooks/useLanguage";
import type { OwnTour } from "../data";

type Props = {
  tour: OwnTour;
  onClick: () => void;
};

export default memo(function TourCard({ tour, onClick }: Props) {
  const { lang, t } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="destination-card" onClick={onClick}>
      {imageLoaded ? (
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
      ) : (
        <div
          ref={imgRef}
          className="destination-card__bg"
          style={{ background: "var(--skeleton-bg, #e2e8f0)" }}
          aria-hidden="true"
        />
      )}
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
