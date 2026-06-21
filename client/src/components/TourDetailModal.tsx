import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Plane,
  Bus,
  Car,
  Ship,
  Train,
  BedDouble,
  Utensils,
  Star,
  Users,
  CheckCircle,
  X,
  Moon,
} from "lucide-react";
import { createInquiry } from "../api";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import type { UnifiedTour } from "../types/providers";
import { useLanguage } from "../hooks/useLanguage";
import { buildSrcSet } from "../lib/images";
import { fmtDate, starsDisplay } from "../lib/formatters";

const fallbackDestinationAliases: Record<string, string> = {
  bulgaria: "bulharsko",
  greece: "recko",
  turkey: "turecko",
};

function normalizeFallbackText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getTourFallbackImage(destination: string): string {
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
  return match?.image ?? "/placeholder-tour.svg";
}

const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  bus: Bus,
  train: Train,
  car: Car,
  boat: Ship,
};

const MAX_VISIBLE_OFFERS = 20;

interface Props {
  tour: UnifiedTour;
  providerLabel: string;
  offers: UnifiedTour[];
  loading: boolean;
  error?: string;
  onClose: () => void;
}

export function TourDetailModal({ tour, providerLabel, offers, loading, error, onClose }: Props) {
  const { t } = useLanguage();
  const transportLabel: Record<string, string> = {
    plane: t("sModalTransportPlane"),
    bus: t("sModalTransportBus"),
    train: t("sModalTransportTrain"),
    car: t("sModalTransportCar"),
    boat: t("sModalTransportBoat"),
  };
  const boardLabel: Record<string, string> = {
    AI: t("sModalBoardAI"),
    UAI: t("sModalBoardUAI"),
    FB: t("sModalBoardFB"),
    HB: t("sModalBoardHB"),
    BB: t("sModalBoardBB"),
    RO: t("sModalBoardRO"),
    SC: t("sModalBoardRO"),
  };
  const [selectedOfferId, setSelectedOfferId] = useState(`${tour.source}-${tour.externalId}`);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryConsent, setInquiryConsent] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inquiryError, setInquiryError] = useState("");
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSelectedOfferId(`${tour.source}-${tour.externalId}`);
    setPhotoIndex(0);
    setInquiryStatus("idle");
    setInquiryError("");
    setShowAllOffers(false);
  }, [tour]);

  // Animate modal in after mount
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimateIn(true);
      });
    });
  }, []);

  const sortedOffers = useMemo(
    () =>
      [...offers].sort(
        (left, right) =>
          new Date(left.startDate).getTime() - new Date(right.startDate).getTime() ||
          left.price - right.price,
      ),
    [offers],
  );
  const selectedOffer =
    sortedOffers.find((offer) => `${offer.source}-${offer.externalId}` === selectedOfferId) ??
    sortedOffers[0] ??
    tour;
  const photos = selectedOffer.photos?.length
    ? selectedOffer.photos
    : [selectedOffer.image || getTourFallbackImage(selectedOffer.destination)];
  const nights =
    selectedOffer.nights ??
    Math.round(
      (new Date(selectedOffer.endDate).getTime() - new Date(selectedOffer.startDate).getTime()) /
        86_400_000,
    );
  const stars = starsDisplay(selectedOffer.stars);
  const hasMultiplePhotos = photos.length > 1;

  const visibleOffers = showAllOffers
    ? sortedOffers
    : sortedOffers.slice(0, MAX_VISIBLE_OFFERS);
  const hiddenOfferCount = Math.max(sortedOffers.length - MAX_VISIBLE_OFFERS, 0);

  function showPreviousPhoto() {
    if (!hasMultiplePhotos) return;
    setPhotoIndex((current) => (current - 1 + photos.length) % photos.length);
  }

  function showNextPhoto() {
    if (!hasMultiplePhotos) return;
    setPhotoIndex((current) => (current + 1) % photos.length);
  }

  // Focus management: save previously-focused element, focus close button,
  // restore focus on unmount. Background is marked inert via aria-hidden.
  useEffect(() => {
    previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    closeButtonRef.current?.focus();
    const root = document.getElementById("root");
    const main = root?.querySelector("main");
    main?.setAttribute("aria-hidden", "true");
    return () => {
      main?.removeAttribute("aria-hidden");
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  // Body scroll lock + keyboard handlers (Esc, arrows, Tab focus trap).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        showPreviousPhoto();
        return;
      }
      if (event.key === "ArrowRight") {
        showNextPhoto();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;
      const focusables = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultiplePhotos, onClose, photos.length]);

  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInquiryError("");
    if (!inquiryConsent) {
      setInquiryError(t("sModalErrorConsent"));
      return;
    }
    setInquiryStatus("sending");
    try {
      await createInquiry({
        email: inquiryEmail,
        destination: `${providerLabel}: ${selectedOffer.title}, ${selectedOffer.destination}, ${fmtDate(selectedOffer.startDate)} - ${fmtDate(selectedOffer.endDate)}, ${formatPrice(selectedOffer.price)}`,
        gdprConsent: true,
        source: "provider-tour-modal",
      });
      setInquiryStatus("sent");
    } catch {
      setInquiryStatus("error");
      setInquiryError(t("sModalErrorSend"));
    }
  }

  const TransportIcon = TRANSPORT_ICONS[selectedOffer.transport] ?? Plane;
  const guestSummary = [
    selectedOffer.adults ? `${selectedOffer.adults} ${t("sFormAdults").toLowerCase()}` : null,
    selectedOffer.children ? `${selectedOffer.children} ${t("sFormChildren").toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      ref={containerRef}
      className={`provider-tour-modal${animateIn ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-tour-modal-title"
    >
      <div className="provider-tour-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="provider-tour-modal__content">
        {/* ── Close button ───────────────────────────────────── */}
        <button
          ref={closeButtonRef}
          type="button"
          className="provider-tour-modal__close"
          onClick={onClose}
          aria-label={t("sModalClose")}
        >
          <X size={20} />
        </button>

        {/* ── Photo area ─────────────────────────────────────── */}
        <div className="provider-tour-modal__media">
          {photos.map((photo, index) => (
            <img
              key={`${photo}-${index}`}
              className={index === photoIndex ? "is-active" : ""}
              src={photo}
              srcSet={buildSrcSet(photo)}
              sizes="(max-width: 768px) 100vw, 800px"
              alt=""
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              width={1200}
              height={750}
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
              }}
            />
          ))}
          {hasMultiplePhotos && (
            <>
              <button
                type="button"
                className="provider-tour-modal__photo-nav provider-tour-modal__photo-nav--prev"
                onClick={showPreviousPhoto}
                aria-label={t("sModalPrev")}
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="provider-tour-modal__photo-nav provider-tour-modal__photo-nav--next"
                onClick={showNextPhoto}
                aria-label={t("sModalNext")}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </>
          )}

          {/* Photo counter badge */}
          {hasMultiplePhotos && (
            <div className="provider-tour-modal__photo-counter">
              {photoIndex + 1} / {photos.length}
            </div>
          )}

          {/* Thumbnail strip */}
          {hasMultiplePhotos && (
            <div className="provider-tour-modal__thumbs">
              {photos.slice(0, 5).map((photo, index) => (
                <button
                  key={`thumb-${index}`}
                  type="button"
                  className={`provider-tour-modal__thumb${index === photoIndex ? " is-active" : ""}`}
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`${t("sModalPhoto")} ${index + 1}`}
                >
                  <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg";
                    }}
                  />
                </button>
              ))}
              {photos.length > 5 && (
                <button
                  type="button"
                  className="provider-tour-modal__thumb provider-tour-modal__thumb--more"
                  onClick={() => setPhotoIndex(5)}
                  aria-label={`${t("sModalPhoto")} 6+`}
                >
                  +{photos.length - 5}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Details panel ───────────────────────────────────── */}
        <div className="provider-tour-modal__body">
          {/* Header */}
          <div className="provider-tour-modal__heading">
            <span className="provider-tour-modal__provider-badge">{providerLabel}</span>
            <h2 id="provider-tour-modal-title">{selectedOffer.title}</h2>
            <p className="provider-tour-modal__destination">
              {selectedOffer.destination}
              {stars && <span className="provider-tour-modal__stars">{stars}</span>}
            </p>
          </div>

          {/* Info rows */}
          <div className="provider-tour-modal__info-rows">
            {/* Date row */}
            <div className="provider-tour-modal__info-row">
              <div className="provider-tour-modal__info-icon">
                <Calendar size={18} />
              </div>
              <div className="provider-tour-modal__info-text">
                <strong>
                  {fmtDate(selectedOffer.startDate)} – {fmtDate(selectedOffer.endDate)}
                </strong>
                <span>
                  {Number.isFinite(nights) && nights > 0
                    ? `${nights + 1} dní / ${nights} ${t("sModalNights")}`
                    : t("sModalByOffer")}
                  {selectedOffer.board &&
                    ` / ${boardLabel[selectedOffer.board] ?? selectedOffer.board}`}
                </span>
              </div>
            </div>

            {/* Transport row */}
            <div className="provider-tour-modal__info-row">
              <div className="provider-tour-modal__info-icon">
                <TransportIcon size={18} />
              </div>
              <div className="provider-tour-modal__info-text">
                <strong>
                  {transportLabel[selectedOffer.transport] ??
                    (selectedOffer.transport || t("sModalByOffer"))}
                </strong>
              </div>
            </div>

            {/* Room row */}
            {selectedOffer.roomType && (
              <div className="provider-tour-modal__info-row">
                <div className="provider-tour-modal__info-icon">
                  <BedDouble size={18} />
                </div>
                <div className="provider-tour-modal__info-text">
                  <strong>{selectedOffer.roomType}</strong>
                  {guestSummary && <span>{guestSummary}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Price card */}
          <div className="provider-tour-modal__price-card">
            <div className="provider-tour-modal__price-main">
              <CheckCircle size={20} className="provider-tour-modal__price-check" />
              <strong>{formatPrice(selectedOffer.price)}</strong>
              <span className="provider-tour-modal__price-per">
                <Users size={14} /> {t("sModalPriceFrom").toLowerCase()}
              </span>
            </div>
            {selectedOffer.adults && selectedOffer.adults > 1 && (
              <div className="provider-tour-modal__price-total">
                <Users size={14} />
                <span>
                  Celková cena{" "}
                  <strong>{formatPrice(selectedOffer.price * selectedOffer.adults)}</strong>
                </span>
              </div>
            )}
          </div>

          {selectedOffer.description && (
            <p className="provider-tour-modal__description">{selectedOffer.description}</p>
          )}

          {/* ── Offers list ──────────────────────────────────── */}
          <section className="provider-tour-modal__offers" aria-live="polite">
            <h3>{t("sModalAvailableDates")}</h3>
            {loading ? (
              <div className="provider-tour-modal__offers-skeleton">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="provider-tour-modal__offer-skeleton-row">
                    <div className="skeleton-line" style={{ width: "35%" }} />
                    <div className="skeleton-line" style={{ width: "15%" }} />
                    <div className="skeleton-line" style={{ width: "20%" }} />
                    <div className="skeleton-line" style={{ width: "18%" }} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="provider-tour-modal__offers-error">{error}</p>
            ) : sortedOffers.length > 0 ? (
              <>
                <div className="provider-tour-modal__offers-list">
                  {visibleOffers.map((offer) => {
                    const offerId = `${offer.source}-${offer.externalId}`;
                    const offerNights =
                      offer.nights ??
                      Math.round(
                        (new Date(offer.endDate).getTime() -
                          new Date(offer.startDate).getTime()) /
                          86_400_000,
                      );
                    const isSelected = offerId === `${selectedOffer.source}-${selectedOffer.externalId}`;
                    return (
                      <button
                        key={offerId}
                        type="button"
                        className={`provider-tour-modal__offer-row${isSelected ? " is-selected" : ""}`}
                        onClick={() => setSelectedOfferId(offerId)}
                      >
                        <span className="provider-tour-modal__offer-date">
                          <Calendar size={14} />
                          {fmtDate(offer.startDate)} – {fmtDate(offer.endDate)}
                        </span>
                        <span className="provider-tour-modal__offer-nights">
                          <Moon size={14} />
                          {Number.isFinite(offerNights) && offerNights > 0
                            ? `${offerNights} ${t("sModalNights")}`
                            : "–"}
                        </span>
                        <span className="provider-tour-modal__offer-board">
                          <Utensils size={14} />
                          {boardLabel[offer.board] ?? offer.board ?? "–"}
                        </span>
                        <span className="provider-tour-modal__offer-price">
                          {formatPrice(offer.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!showAllOffers && hiddenOfferCount > 0 && (
                  <button
                    type="button"
                    className="provider-tour-modal__offers-show-all"
                    onClick={() => setShowAllOffers(true)}
                  >
                    Zobrazit všech {sortedOffers.length} termínů
                  </button>
                )}
              </>
            ) : (
              <p className="provider-tour-modal__offers-empty">{t("sModalNoDates")}</p>
            )}
          </section>

          {/* ── Inquiry form ─────────────────────────────────── */}
          <form className="provider-tour-modal__inquiry" onSubmit={submitInquiry}>
            <div className="provider-tour-modal__inquiry-header">
              <Star size={16} />
              <span>{t("sModalEmailLabel")}</span>
            </div>
            <div className="provider-tour-modal__inquiry-fields">
              <input
                type="email"
                value={inquiryEmail}
                onChange={(event) => setInquiryEmail(event.target.value)}
                placeholder={t("sModalEmailPlaceholder")}
                required
              />
              <button type="submit" disabled={inquiryStatus === "sending"}>
                {inquiryStatus === "sending" ? t("sModalSending") : t("sModalSubmit")}
              </button>
            </div>
            <label className="provider-tour-modal__consent">
              <input
                type="checkbox"
                checked={inquiryConsent}
                onChange={(event) => setInquiryConsent(event.target.checked)}
                required
              />
              <span className="provider-tour-modal__consent-text">
                {t("sModalConsentPre")} <Link to="/gdpr">{t("sModalConsentLink")}</Link>.
              </span>
            </label>
            {inquiryError && <p className="provider-tour-modal__form-error">{inquiryError}</p>}
            {inquiryStatus === "sent" && (
              <p className="provider-tour-modal__form-success">
                <CheckCircle size={16} /> {t("sModalSent")}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
