import { CheckCircle, Users, TrendingDown } from "lucide-react";
import { formatPrice } from "../../../utils";
import { isPlausibleTourPrice } from "../../../lib/prices";
import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  tour: UnifiedTour;
  providerLabel: string;
  t: (key: TranslationKey) => string;
  onInquiry: () => void;
}

export function TourPriceCard({ tour, providerLabel, t, onInquiry }: Props) {
  const hasDiscount =
    tour.originalPrice && tour.originalPrice > tour.price && isPlausibleTourPrice(tour.price);
  const savings = hasDiscount ? tour.originalPrice! - tour.price : 0;
  const percent = hasDiscount ? Math.round((savings / tour.originalPrice!) * 100) : 0;
  const totalPrice = tour.adults && tour.adults > 1 ? tour.price * tour.adults : null;

  return (
    <div className="tour-price-card">
      {hasDiscount && percent >= 5 && (
        <div className="tour-price-card__discount-badge">
          <TrendingDown size={14} /> -{percent}%
        </div>
      )}

      <div className="tour-price-card__main">
        <CheckCircle size={20} className="tour-price-card__check" />
        {isPlausibleTourPrice(tour.price) ? (
          <strong className="tour-price-card__amount">{formatPrice(tour.price)}</strong>
        ) : (
          <span className="tour-price-card__request">{t("sPriceOnRequest")}</span>
        )}
        <span className="tour-price-card__per">/ {t("sModalPriceFrom").toLowerCase()}</span>
      </div>

      {hasDiscount && (
        <div className="tour-price-card__savings">
          <s>{formatPrice(tour.originalPrice)}</s>
          <span>Ušetříte {formatPrice(savings)}</span>
        </div>
      )}

      {totalPrice && (
        <div className="tour-price-card__total">
          <Users size={14} />
          Celkem za {tour.adults} osoby: <strong>{formatPrice(totalPrice)}</strong>
        </div>
      )}

      <button type="button" className="tour-price-card__cta" onClick={onInquiry}>
        {t("sModalSubmit")}
      </button>

      <a href="tel:+420721163860" className="tour-price-card__call">
        Nebo zavolejte: +420 721 163 860
      </a>

      <div className="tour-price-card__provider">
        {providerLabel}
      </div>
    </div>
  );
}
