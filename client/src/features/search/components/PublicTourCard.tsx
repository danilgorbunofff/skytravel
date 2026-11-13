import { memo, useEffect, useRef, useState } from "react";
import {
  Heart,
  Plane,
  Bus,
  Car,
  Train,
  Ship,
  Scale,
  Utensils,
  Coffee,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";
import { formatPrice } from "../../../utils";
import StarRating from "../../../components/StarRating";
import { buildSrcSet, isValidImageUrl } from "../../../lib/images";
import { discountPercent, isPlausibleTourPrice } from "../../../lib/prices";
import { countLabel, fmtDate } from "../../../lib/formatters";
import { favorites as popularDestinations } from "../../../data";
import { fallbackDestinationAliases, getTransportLabel, getBoardLabel } from "../constants";

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

const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  bus: Bus,
  car: Car,
  train: Train,
  boat: Ship,
};

// Meals only: all-inclusive and full/half board share the cutlery icon; breakfast gets a cup;
// room-only and self-catering show no icon.
const BOARD_ICONS: Record<string, typeof Utensils> = {
  AI: Utensils,
  UAI: Utensils,
  FB: Utensils,
  HB: Utensils,
  BB: Coffee,
};

/** Props for {@link PublicTourCard}. */
interface Props {
  /** Translation function. */
  t: (key: TranslationKey) => string;
  /** Tour data to display. */
  tour: UnifiedTour;
  /** Layout mode: grid card or list row. */
  viewMode: "grid" | "list";
  /** Whether the tour is saved in the user's favorites. */
  isFavorite: boolean;
  /**
   * Toggle favorite status. Takes the tour so the parent can pass a
   * referentially stable handler and let `memo` actually hold.
   */
  onToggleFavorite: (tour: UnifiedTour) => void;
  /** Open the detail modal for this tour. */
  onOpenDetail: (tour: UnifiedTour) => void;
  /** Human-readable provider name shown as a badge. */
  providerLabel?: string;
  /** Index for staggered entrance animation delay. */
  animationIndex?: number;
  /** Whether this tour is in the comparison tray. */
  isCompared?: boolean;
  /** Add or remove from the comparison list. */
  onToggleCompare?: (tour: UnifiedTour) => void;
  /** Whether the comparison list has reached its capacity. */
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
  const imageSrc = isValidImageUrl(tour.image)
    ? tour.image
    : getTourFallbackImage(tour.destination);
  const srcSet = buildSrcSet(imageSrc);
  const TransportIcon = TRANSPORT_ICONS[tour.transport] ?? Plane;
  const transportLabels = getTransportLabel(t);
  const boardLabels = getBoardLabel(t);
  const BoardIcon = tour.board ? (BOARD_ICONS[tour.board] ?? null) : null;
  const hasPrice = isPlausibleTourPrice(tour.price);
  const discount = discountPercent(tour.price, tour.originalPrice);
  const departed = isDeparted(tour.startDate);
  const validStars = tour.stars && Number(tour.stars) >= 1 && Number(tour.stars) <= 5;

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
  }, [viewMode]);

  const staggerStyle = {
    "--card-index": animationIndex,
    animationDelay: `${Math.min(animationIndex * 50, 300)}ms`,
  } as React.CSSProperties;

  const cardClass = `tour-card tour-card--${viewMode}${departed ? " is-departed" : ""}`;

  // The title button is the card's single "open detail" control; CSS stretches its hit area
  // over the whole card, so heart/compare stay real, separate buttons (no nested controls).
  const openButton = (
    <button type="button" className="tour-card__open" onClick={() => onOpenDetail(tour)}>
      {tour.title}
    </button>
  );

  const heartButton = (
    <button
      type="button"
      className={`tour-card__heart${isFavorite ? " is-saved" : ""}`}
      aria-label={isFavorite ? t("sCardUnsave") : t("sCardSave")}
      aria-pressed={isFavorite}
      onClick={() => onToggleFavorite(tour)}
    >
      <Heart size={16} aria-hidden="true" />
    </button>
  );

  const image = imageLoaded ? (
    <img
      src={imageSrc}
      srcSet={srcSet}
      sizes={
        viewMode === "list"
          ? "200px"
          : srcSet
            ? "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            : undefined
      }
      alt=""
      loading="lazy"
      decoding="async"
      width={viewMode === "list" ? 200 : 640}
      height={viewMode === "list" ? 140 : 400}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          img.src = "/placeholder-tour.svg";
        }
      }}
    />
  ) : (
    <div ref={imgRef} aria-hidden="true" className="w-full h-full bg-slate-200 dark:bg-slate-700" />
  );

  const badges = (
    <>
      {tour.nights != null && (
        <span className="tour-card__nights-badge">{countLabel(t, tour.nights, "nights")}</span>
      )}
      {(tour.offersCount ?? 0) > 1 && (
        <span className="tour-card__offers-badge">
          {countLabel(t, tour.offersCount ?? 0, "sTermsCount")}
        </span>
      )}
      {departed && <span className="tour-card__status-badge">{t("sDeparted")}</span>}
    </>
  );

  const price = hasPrice ? (
    <>
      {discount != null && (
        <s className="tour-card__price-old">
          <span className="sr-only">{t("sOriginalPrice")}: </span>
          {formatPrice(tour.originalPrice)}
        </s>
      )}
      <strong>{formatPrice(tour.price)}</strong>
      <span className="tour-card__price-suffix"> {t("sPerPerson")}</span>
      {discount != null && <span className="tour-card__discount">−{discount} %</span>}
    </>
  ) : (
    <span className="tour-card__price-request">{t("sPriceOnRequest")}</span>
  );

  const dates = tour.startDate && (
    <>
      <CalendarDays size={12} aria-hidden="true" />
      {fmtDate(tour.startDate)}
      {tour.endDate && ` – ${fmtDate(tour.endDate)}`}
    </>
  );

  if (viewMode === "grid") {
    return (
      <article className={cardClass} style={staggerStyle}>
        <div className="tour-card__image">
          {image}
          {heartButton}
          {onToggleCompare && (
            <button
              type="button"
              className={`tour-card__compare${isCompared ? " is-active" : ""}${!isCompared && compareFull ? " is-disabled" : ""}`}
              aria-label={isCompared ? t("sCompareRemoveFrom") : t("sCompareAdd")}
              aria-pressed={isCompared}
              title={!isCompared && compareFull ? t("sCompareFull") : undefined}
              onClick={() => onToggleCompare(tour)}
              disabled={!isCompared && compareFull}
            >
              <Scale size={14} aria-hidden="true" />
            </button>
          )}
          {providerLabel && <span className="tour-card__provider">{providerLabel}</span>}
          {badges}
        </div>

        <div className="tour-card__body">
          <div className="tour-card__destination">{tour.destination}</div>
          <h3 className="tour-card__title">{openButton}</h3>

          <div className="tour-card__meta">
            <span className="tour-card__meta-item">
              <TransportIcon size={14} aria-hidden="true" />
              {transportLabels[tour.transport] ?? tour.transport}
            </span>
            {validStars && (
              <span className="tour-card__meta-item tour-card__stars">
                <StarRating rating={Number(tour.stars)} />
              </span>
            )}
          </div>

          {tour.board && (
            <div className="tour-card__board">
              {BoardIcon && <BoardIcon size={12} aria-hidden="true" />}
              <span>{boardLabels[tour.board] ?? tour.board}</span>
            </div>
          )}

          {dates && <div className="tour-card__dates">{dates}</div>}

          <div className="tour-card__price-row">
            <div className="tour-card__price">{price}</div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cardClass} style={staggerStyle}>
      <div className="tour-card__image tour-card__image--list">
        {image}
        {heartButton}
        {badges}
      </div>

      <div className="tour-card__body tour-card__body--list">
        <div className="tour-card__list-top">
          <div className="tour-card__destination">{tour.destination}</div>
          <h3 className="tour-card__title">{openButton}</h3>
          {validStars && (
            <span className="tour-card__stars">
              <StarRating rating={Number(tour.stars)} />
            </span>
          )}
          {providerLabel && <span className="tour-card__provider-inline">{providerLabel}</span>}
        </div>

        <div className="tour-card__list-meta">
          <span className="tour-card__meta-item">
            <TransportIcon size={14} aria-hidden="true" />
            {transportLabels[tour.transport] ?? tour.transport}
          </span>
          {tour.board && (
            <span className="tour-card__meta-item">
              {BoardIcon && <BoardIcon size={12} aria-hidden="true" />}
              {boardLabels[tour.board] ?? tour.board}
            </span>
          )}
          {dates && <span className="tour-card__meta-item">{dates}</span>}
        </div>

        <div className="tour-card__list-actions">
          <div className="tour-card__price-row tour-card__price">{price}</div>
          {/* Visual cue only: the whole card already opens the detail. */}
          <span className="tour-card__detail-btn" aria-hidden="true">
            <ChevronRight size={18} />
          </span>
        </div>
      </div>
    </article>
  );
});

/** Departure date already in the past (saved tours can outlive their date). */
function isDeparted(startDate: string | null | undefined): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return start < today;
}
