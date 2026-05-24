import { memo } from "react";
import { Heart, Search, Plane, Bus, Car, Calendar, Layers } from "lucide-react";
import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { formatPrice } from "../../../utils";
import { buildSrcSet } from "../../../lib/images";
import { isPlausibleTourPrice } from "../../../lib/prices";
import { fmtDate } from "../../../lib/formatters";
import { favorites as popularDestinations } from "../../../data";
import { fallbackDestinationAliases, getTransportLabel } from "../constants";

const fallbackImageCache = new Map<string, string>();

function normalizeFallbackText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function getTourFallbackImage(destination: string): string {
  const cached = fallbackImageCache.get(destination);
  if (cached !== undefined) return cached;
  const normalizedDestination = normalizeFallbackText(destination);
  const alias = Object.entries(fallbackDestinationAliases).find(([key]) =>
    normalizedDestination.includes(key),
  )?.[1];
  const match = popularDestinations.find((item) => {
    const normalizedFavorite = normalizeFallbackText(item.destination);
    return (
      normalizedDestination.includes(normalizedFavorite) ||
      (alias != null && normalizedFavorite.includes(alias))
    );
  });
  const resolved = match?.image ?? "/placeholder-tour.svg";
  fallbackImageCache.set(destination, resolved);
  return resolved;
}

function getDiscount(tour: UnifiedTour): { amount: number; percent: number } | null {
  if (!tour.originalPrice || tour.originalPrice <= tour.price) return null;
  if (!isPlausibleTourPrice(tour.price)) return null;
  const amount = tour.originalPrice - tour.price;
  const percent = Math.round((amount / tour.originalPrice) * 100);
  if (percent < 5) return null;
  return { amount, percent };
}

const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  bus: Bus,
  car: Car,
};

interface Props {
  t: (key: TranslationKey) => string;
  tour: UnifiedTour;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
  providerLabel?: string;
  animationIndex?: number;
  isCompared?: boolean;
  onToggleCompare?: () => void;
  compareFull?: boolean;
}

export const PublicTourCard = memo(function PublicTourCard({
  t,
  tour,
  viewMode,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  providerLabel,
  animationIndex = 0,
  isCompared = false,
  onToggleCompare,
  compareFull = false,
}: Props) {
  function stopCardAction(event: React.MouseEvent, action: () => void) {
    event.stopPropagation();
    action();
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenDetail();
  }

  const imageSrc = tour.image || getTourFallbackImage(tour.destination);
  const srcSet = buildSrcSet(imageSrc);
  const discount = getDiscount(tour);
  const TransportIcon = TRANSPORT_ICONS[tour.transport] ?? Plane;
  const transportLabels = getTransportLabel(t);

  const staggerStyle = {
    "--card-index": animationIndex,
    animationDelay: `${Math.min(animationIndex * 50, 300)}ms`,
  } as React.CSSProperties;

  // Grid view
  if (viewMode === "grid") {
    return (
      <article
        className="tour-card tour-card--grid"
        role="button"
        tabIndex={0}
        onClick={onOpenDetail}
        onKeyDown={handleCardKeyDown}
        style={staggerStyle}
      >
        <div className="tour-card__image">
          <img
            src={imageSrc}
            srcSet={srcSet}
            sizes={srcSet ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined}
            alt={tour.title}
            loading="lazy"
            decoding="async"
            width={640}
            height={400}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = "/placeholder-tour.svg";
              }
            }}
          />
          <button
            type="button"
            className={`tour-card__heart${isFavorite ? " is-saved" : ""}`}
            aria-label={isFavorite ? t("sCardUnsave") : t("sCardSave")}
            onClick={(event) => stopCardAction(event, onToggleFavorite)}
          >
            <Heart size={16} aria-hidden="true" />
          </button>
          {onToggleCompare && (
            <button
              type="button"
              className={`tour-card__compare${isCompared ? " is-active" : ""}${!isCompared && compareFull ? " is-disabled" : ""}`}
              aria-label={isCompared ? "Odebrat z porovnání" : "Přidat k porovnání"}
              onClick={(event) => stopCardAction(event, onToggleCompare)}
              disabled={!isCompared && compareFull}
            >
              <Layers size={14} aria-hidden="true" />
            </button>
          )}
          {discount && (
            <span className="tour-card__discount">-{discount.percent}%</span>
          )}
          {providerLabel && (
            <span className="tour-card__provider">{providerLabel}</span>
          )}
        </div>

        <div className="tour-card__body">
          <div className="tour-card__destination">{tour.destination}</div>
          <h3 className="tour-card__title">{tour.title}</h3>

          <div className="tour-card__meta">
            <span className="tour-card__meta-item">
              <TransportIcon size={14} aria-hidden="true" />
              {transportLabels[tour.transport] ?? tour.transport}
            </span>
            {tour.nights != null && (
              <span className="tour-card__meta-item">
                {tour.nights} {t("nights")}
              </span>
            )}
            {tour.stars && Number(tour.stars) >= 1 && Number(tour.stars) <= 5 && (
              <span className="tour-card__meta-item tour-card__stars">
                {"★".repeat(Math.min(5, Math.max(1, Math.round(Number(tour.stars)))))}
              </span>
            )}
          </div>

          {tour.board && (
            <div className="tour-card__board">{tour.board}</div>
          )}

          {tour.startDate && (
            <div className="tour-card__dates">
              <Calendar size={12} aria-hidden="true" />
              {fmtDate(tour.startDate)}
              {tour.endDate && ` – ${fmtDate(tour.endDate)}`}
            </div>
          )}

          <div className="tour-card__price-row">
            <div className="tour-card__price">
              {isPlausibleTourPrice(tour.price) ? (
                <>
                  <strong>{formatPrice(tour.price)}</strong>
                  <span className="tour-card__price-suffix"> / os.</span>
                </>
              ) : (
                <span className="tour-card__price-request">{t("sPriceOnRequest")}</span>
              )}
            </div>
            {discount && (
              <div className="tour-card__original-price">
                <s>{formatPrice(tour.originalPrice)}</s>
              </div>
            )}
          </div>

          {(tour.offersCount ?? 0) > 1 && (
            <div className="tour-card__offers-count">
              {tour.offersCount} {t("sStateTerms")} →
            </div>
          )}
        </div>
      </article>
    );
  }

  // List view
  return (
    <article
      className="tour-card tour-card--list"
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={handleCardKeyDown}
      style={staggerStyle}
    >
      <div className="tour-card__image tour-card__image--list">
        <img
          src={imageSrc}
          srcSet={srcSet}
          sizes="200px"
          alt={tour.title}
          loading="lazy"
          decoding="async"
          width={200}
          height={140}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = "1";
              img.src = "/placeholder-tour.svg";
            }
          }}
        />
        {discount && (
          <span className="tour-card__discount">-{discount.percent}%</span>
        )}
      </div>

      <div className="tour-card__body tour-card__body--list">
        <div className="tour-card__list-top">
          <div className="tour-card__destination">{tour.destination}</div>
          <h3 className="tour-card__title">{tour.title}</h3>
          {tour.stars && Number(tour.stars) >= 1 && Number(tour.stars) <= 5 && (
            <span className="tour-card__stars">{"★".repeat(Math.min(5, Math.max(1, Math.round(Number(tour.stars)))))}</span>
          )}
          {providerLabel && (
            <span className="tour-card__provider-inline">{providerLabel}</span>
          )}
        </div>

        <div className="tour-card__list-meta">
          <span className="tour-card__meta-item">
            <TransportIcon size={14} aria-hidden="true" />
            {transportLabels[tour.transport] ?? tour.transport}
          </span>
          {tour.nights != null && (
            <span className="tour-card__meta-item">{tour.nights} {t("nights")}</span>
          )}
          {tour.board && (
            <span className="tour-card__meta-item">{tour.board}</span>
          )}
          {tour.startDate && (
            <span className="tour-card__meta-item">
              {fmtDate(tour.startDate)}
              {tour.endDate && `–${fmtDate(tour.endDate)}`}
            </span>
          )}
        </div>

        <div className="tour-card__list-actions">
          <div className="tour-card__price-row">
            <strong>{isPlausibleTourPrice(tour.price) ? formatPrice(tour.price) : t("sPriceOnRequest")}</strong>
            {discount && <s className="tour-card__original-price">{formatPrice(tour.originalPrice)}</s>}
            {discount && <span className="tour-card__discount-inline">-{discount.percent}%</span>}
          </div>
          {(tour.offersCount ?? 0) > 1 && (
            <span className="tour-card__offers-count">{tour.offersCount} {t("sStateTerms")}</span>
          )}
          <button
            type="button"
            className={`tour-card__heart${isFavorite ? " is-saved" : ""}`}
            aria-label={isFavorite ? t("sCardUnsave") : t("sCardSave")}
            onClick={(event) => stopCardAction(event, onToggleFavorite)}
          >
            <Heart size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tour-card__detail-btn"
            onClick={(event) => stopCardAction(event, onOpenDetail)}
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});
