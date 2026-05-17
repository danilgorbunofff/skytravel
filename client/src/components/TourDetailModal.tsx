import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createInquiry } from "../api";
import { formatPrice } from "../utils";
import { favorites as popularDestinations } from "../data";
import type { UnifiedTour } from "../types/providers";
import { useLanguage } from "../hooks/useLanguage";
import { buildSrcSet } from "../lib/images";
import { fmtDate, starsDisplay } from "../lib/formatters";

const fallbackDestinationAliases: Record<string, string> = {
  bulgaria: "bulharsko",
  egypt: "egypt",
  greece: "recko",
  tunisia: "tunisko",
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
  const alias = Object.entries(fallbackDestinationAliases).find(([key]) => normalizedDestination.includes(key))?.[1];
  const match = popularDestinations.find((item) => {
    const normalizedFavorite = normalizeFallbackText(item.destination);
    return normalizedDestination.includes(normalizedFavorite) || (alias != null && normalizedFavorite.includes(alias));
  });
  return match?.image ?? "/placeholder-tour.svg";
}

interface Props {
  tour: UnifiedTour;
  providerLabel: string;
  offers: UnifiedTour[];
  loading: boolean;
  error?: string;
  onClose: () => void;
}

export function TourDetailModal({
  tour,
  providerLabel,
  offers,
  loading,
  error,
  onClose,
}: Props) {
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

  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSelectedOfferId(`${tour.source}-${tour.externalId}`);
    setPhotoIndex(0);
    setInquiryStatus("idle");
    setInquiryError("");
  }, [tour]);

  const sortedOffers = useMemo(
    () => [...offers].sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime() || left.price - right.price),
    [offers],
  );
  const selectedOffer = sortedOffers.find((offer) => `${offer.source}-${offer.externalId}` === selectedOfferId) ?? sortedOffers[0] ?? tour;
  const photos = selectedOffer.photos?.length
    ? selectedOffer.photos
    : [selectedOffer.image || getTourFallbackImage(selectedOffer.destination)];
  const nights = selectedOffer.nights ?? Math.round(
    (new Date(selectedOffer.endDate).getTime() - new Date(selectedOffer.startDate).getTime()) / 86_400_000,
  );
  const stars = starsDisplay(selectedOffer.stars);
  const hasMultiplePhotos = photos.length > 1;

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
      if (event.key === "ArrowLeft") { showPreviousPhoto(); return; }
      if (event.key === "ArrowRight") { showNextPhoto(); return; }
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

  return (
    <div
      ref={containerRef}
      className="provider-tour-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-tour-modal-title"
    >
      <div className="provider-tour-modal__backdrop" onClick={onClose} />
      <div className="provider-tour-modal__content">
        <button
          ref={closeButtonRef}
          type="button"
          className="provider-tour-modal__close"
          onClick={onClose}
          aria-label={t("sModalClose")}
        >
          ✕
        </button>
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
              onError={(event) => { (event.currentTarget as HTMLImageElement).src = "/placeholder-tour.svg"; }}
            />
          ))}
          {hasMultiplePhotos && (
            <>
              <button type="button" className="provider-tour-modal__photo-nav provider-tour-modal__photo-nav--prev" onClick={showPreviousPhoto} aria-label={t("sModalPrev")}>
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className="provider-tour-modal__photo-nav provider-tour-modal__photo-nav--next" onClick={showNextPhoto} aria-label={t("sModalNext")}>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
          {hasMultiplePhotos && (
            <div className="provider-tour-modal__dots">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={index === photoIndex ? "is-active" : ""}
                  aria-label={`${t("sModalPhoto")} ${index + 1}`}
                  onClick={() => setPhotoIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="provider-tour-modal__body">
          <div className="provider-tour-modal__heading">
            <span>{providerLabel}</span>
            <h2 id="provider-tour-modal-title">{selectedOffer.title}</h2>
            <p>{selectedOffer.destination}</p>
          </div>

          <div className="provider-tour-modal__facts">
            <div><span>{t("sModalTerm")}</span><strong>{fmtDate(selectedOffer.startDate)} – {fmtDate(selectedOffer.endDate)}</strong></div>
            <div><span>{t("sModalLength")}</span><strong>{Number.isFinite(nights) && nights > 0 ? `${nights} ${t("sModalNights")}` : t("sModalByOffer")}</strong></div>
            <div><span>{t("sModalTransport")}</span><strong>{transportLabel[selectedOffer.transport] ?? (selectedOffer.transport || t("sModalByOffer"))}</strong></div>
            <div><span>{t("sModalBoard")}</span><strong>{boardLabel[selectedOffer.board] ?? (selectedOffer.board || t("sModalByOffer"))}</strong></div>
            {stars && <div><span>{t("sModalHotel")}</span><strong>{stars}</strong></div>}
            {selectedOffer.roomType && <div><span>{t("sModalRoom")}</span><strong>{selectedOffer.roomType}</strong></div>}
            <div className="provider-tour-modal__price"><span>{t("sModalPriceFrom")}</span><strong>{formatPrice(selectedOffer.price)}</strong></div>
          </div>

          {selectedOffer.description && (
            <p className="provider-tour-modal__description">{selectedOffer.description}</p>
          )}

          <section className="provider-tour-modal__offers" aria-live="polite">
            <h3>{t("sModalAvailableDates")}</h3>
            {loading ? (
              <p>{t("sModalLoadingDates")}</p>
            ) : error ? (
              <p>{error}</p>
            ) : sortedOffers.length > 0 ? (
              <label className="provider-tour-modal__date-select">
                <span className="provider-tour-modal__field-label">{t("sModalSelectDate")}</span>
                <select value={`${selectedOffer.source}-${selectedOffer.externalId}`} onChange={(event) => setSelectedOfferId(event.target.value)}>
                  {sortedOffers.map((offer) => {
                    const offerId = `${offer.source}-${offer.externalId}`;
                    const offerNights = offer.nights ?? Math.round(
                      (new Date(offer.endDate).getTime() - new Date(offer.startDate).getTime()) / 86_400_000,
                    );
                    return (
                      <option key={offerId} value={offerId}>
                        {fmtDate(offer.startDate)} - {fmtDate(offer.endDate)} · {Number.isFinite(offerNights) && offerNights > 0 ? `${offerNights} ${t("sModalNights")}` : t("sModalLengthByOffer")} · {formatPrice(offer.price)}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : (
              <p>{t("sModalNoDates")}</p>
            )}
          </section>

          <form className="provider-tour-modal__inquiry" onSubmit={submitInquiry}>
            <label>
              <span className="provider-tour-modal__field-label">{t("sModalEmailLabel")}</span>
              <input
                type="email"
                value={inquiryEmail}
                onChange={(event) => setInquiryEmail(event.target.value)}
                placeholder={t("sModalEmailPlaceholder")}
                required
              />
            </label>
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
            {inquiryStatus === "sent" && <p className="provider-tour-modal__form-success">{t("sModalSent")}</p>}
            <button type="submit" disabled={inquiryStatus === "sending"}>
              {inquiryStatus === "sending" ? t("sModalSending") : t("sModalSubmit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
