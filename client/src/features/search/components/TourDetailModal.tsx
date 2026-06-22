import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Calendar, Plane, Bus, Car, Ship, Train, BedDouble, Moon, Share2, Bell, Loader2, CheckCircle } from "lucide-react";
import type { UnifiedTour } from "../../../types/providers";
import { useLanguage } from "../../../hooks/useLanguage";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { fmtDate, starsDisplay } from "../../../lib/formatters";
import { createAlert } from "../../../api";
import { TourGallery } from "./TourGallery";
import { TourPriceCard } from "./TourPriceCard";
import { TourDetailTabs } from "./TourDetailTabs";
import { OfferComparisonTable } from "./OfferComparisonTable";
import { TourInquiryForm } from "./TourInquiryForm";
import { RelatedTours } from "./RelatedTours";
import { getTourFallbackImage } from "./PublicTourCard";
import { isValidImageUrl } from "../../../lib/images";

const TRANSPORT_ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  bus: Bus,
  train: Train,
  car: Car,
  boat: Ship,
};

interface Props {
  tour: UnifiedTour;
  providerLabel: string;
  offers: UnifiedTour[];
  loading: boolean;
  error?: string;
  relatedTours?: UnifiedTour[];
  onClose: () => void;
  onNavigateToTour?: (tour: UnifiedTour) => void;
}

export function TourDetailModal({
  tour,
  providerLabel,
  offers,
  loading,
  error,
  relatedTours = [],
  onClose,
  onNavigateToTour,
}: Props) {
  const { t } = useLanguage();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [selectedOfferId, setSelectedOfferId] = useState(`${tour.source}-${tour.externalId}`);
  const [animateIn, setAnimateIn] = useState(false);
  const [shareToast, setShareToast] = useState<"copied" | "failed" | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState<"idle" | "sending" | "sent">("idle");
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const inquiryRef = useRef<HTMLDivElement>(null);

  const boardLabel: Record<string, string> = {
    AI: t("sModalBoardAI"),
    UAI: t("sModalBoardUAI"),
    FB: t("sModalBoardFB"),
    HB: t("sModalBoardHB"),
    BB: t("sModalBoardBB"),
    RO: t("sModalBoardRO"),
    SC: t("sModalBoardRO"),
  };

  const transportLabel: Record<string, string> = {
    plane: t("sModalTransportPlane"),
    bus: t("sModalTransportBus"),
    train: t("sModalTransportTrain"),
    car: t("sModalTransportCar"),
    boat: t("sModalTransportBoat"),
  };

  useEffect(() => {
    setSelectedOfferId(`${tour.source}-${tour.externalId}`);
    // Scroll modal content to top when navigating to a new tour
    const contentEl = containerRef.current?.querySelector(".tour-detail-modal__content");
    if (contentEl) contentEl.scrollTop = 0;
  }, [tour]);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateIn(true));
    });
  }, []);

  // Focus management
  useEffect(() => {
    previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    closeButtonRef.current?.focus();
    const main = document.querySelector("main");
    main?.setAttribute("aria-hidden", "true");
    return () => {
      main?.removeAttribute("aria-hidden");
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  // Body scroll lock + keyboard
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;
      const focusables = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const sortedOffers = useMemo(
    () =>
      [...offers].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime() || a.price - b.price,
      ),
    [offers],
  );

  const selectedOffer =
    sortedOffers.find((o) => `${o.source}-${o.externalId}` === selectedOfferId) ??
    sortedOffers[0] ??
    tour;

  const photos = selectedOffer.photos?.length
    ? selectedOffer.photos.filter(isValidImageUrl)
    : [isValidImageUrl(selectedOffer.image) ? selectedOffer.image : getTourFallbackImage(selectedOffer.destination)];

  const nights =
    selectedOffer.nights ??
    Math.round(
      (new Date(selectedOffer.endDate).getTime() - new Date(selectedOffer.startDate).getTime()) /
        86_400_000,
    );

  const stars = starsDisplay(selectedOffer.stars);
  const TransportIcon = TRANSPORT_ICONS[selectedOffer.transport] ?? Plane;
  const currentTourId = `${selectedOffer.source}-${selectedOffer.externalId}`;

  function scrollToInquiry() {
    inquiryRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ url, title: selectedOffer.title });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareToast("copied");
      } else {
        setShareToast("failed");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setShareToast("failed");
      console.warn("share failed", err);
    } finally {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => setShareToast(null), 2500);
    }
  }, [selectedOffer.title]);

  function handleAlertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alertEmail) return;
    setAlertStatus("sending");
    createAlert({
      email: alertEmail,
      providerId: selectedOffer.source,
      externalId: selectedOffer.externalId,
      priceMax: selectedOffer.price,
    })
      .then(() => setAlertStatus("sent"))
      .catch(() => setAlertStatus("idle"));
  }

  return (
    <div
      ref={containerRef}
      className={`tour-detail-modal${animateIn ? " is-open" : ""}${isMobile ? " tour-detail-modal--mobile" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-detail-modal-title"
    >
      <div className="tour-detail-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="tour-detail-modal__content">
        {/* Fixed Header (mobile) / Default (desktop) */}
        {isMobile && (
          <div className="tour-detail-modal__mobile-header">
            <h3 id="tour-detail-modal-title" className="tour-detail-modal__mobile-title">
              {selectedOffer.title}
            </h3>
            <div className="tour-detail-modal__mobile-header-actions">
              <button
                type="button"
                className="tour-detail-modal__share"
                onClick={handleShare}
                aria-label="Sdílet"
              >
                <Share2 size={18} />
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                className="tour-detail-modal__close"
                onClick={onClose}
                aria-label={t("sModalClose")}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Gallery */}
        <TourGallery photos={photos} alt={selectedOffer.title} />

        {/* Share toast */}
        {shareToast && (
          <div className={`tour-detail-modal__toast ${shareToast === "copied" ? "is-success" : "is-error"}`}>
            {shareToast === "copied" ? "Odkaz zkopírován" : "Sdílení se nezdařilo"}
          </div>
        )}

        {/* Body */}
        <div className="tour-detail-modal__body">
          {/* Header (desktop) */}
          {!isMobile && (
            <>
              <button
                type="button"
                className="tour-detail-modal__share"
                onClick={handleShare}
                aria-label="Sdílet"
              >
                <Share2 size={18} />
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                className="tour-detail-modal__close"
                onClick={onClose}
                aria-label={t("sModalClose")}
              >
                <X size={20} />
              </button>
              <div className="tour-detail-modal__header">
                <h2 id="tour-detail-modal-title">{selectedOffer.title}</h2>
                <p className="tour-detail-modal__subtitle">
                  {selectedOffer.destination}
                  {stars && <span className="tour-detail-modal__stars">{stars}</span>}
                </p>
              </div>
            </>
          )}

          {/* Mobile subtitle */}
          {isMobile && (
            <div className="tour-detail-modal__header">
              <p className="tour-detail-modal__subtitle">
                {selectedOffer.destination}
                {stars && <span className="tour-detail-modal__stars">{stars}</span>}
              </p>
            </div>
          )}

          {/* Key Facts */}
          <div className="tour-detail-modal__facts">
            <div className="tour-detail-modal__fact">
              <Calendar size={16} />
              <span>
                {fmtDate(selectedOffer.startDate)} – {fmtDate(selectedOffer.endDate)}
                {Number.isFinite(nights) && nights > 0 && ` (${nights} nocí)`}
              </span>
            </div>
            <div className="tour-detail-modal__fact">
              <TransportIcon size={16} />
              <span>{transportLabel[selectedOffer.transport] ?? selectedOffer.transport}</span>
            </div>
            {selectedOffer.board && (
              <div className="tour-detail-modal__fact">
                <Moon size={16} />
                <span>{boardLabel[selectedOffer.board] ?? selectedOffer.board}</span>
              </div>
            )}
            {selectedOffer.roomType && (
              <div className="tour-detail-modal__fact">
                <BedDouble size={16} />
                <span>{selectedOffer.roomType}</span>
              </div>
            )}
          </div>

          {/* Price Card + Price Alert */}
          <div className="tour-detail-modal__price-section">
            <TourPriceCard
              tour={selectedOffer}
              providerLabel={providerLabel}
              t={t}
              onInquiry={scrollToInquiry}
            />

            {/* Price Alert Bell */}
            <div className="tour-detail-modal__alert">
              {!alertOpen && alertStatus !== "sent" && (
                <button
                  type="button"
                  className="tour-detail-modal__alert-btn"
                  onClick={() => setAlertOpen(true)}
                  aria-label="Hlídání ceny"
                >
                  <Bell size={16} />
                  Hlídat cenu
                </button>
              )}
              {alertOpen && alertStatus !== "sent" && (
                <form className="tour-detail-modal__alert-form" onSubmit={handleAlertSubmit}>
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="Váš e-mail"
                    required
                    className="tour-detail-modal__alert-input"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="tour-detail-modal__alert-submit"
                    disabled={alertStatus === "sending"}
                  >
                    {alertStatus === "sending" ? (
                      <><Loader2 size={14} className="animate-spin" /> Odesílám...</>
                    ) : (
                      "Hlídat"
                    )}
                  </button>
                </form>
              )}
              {alertStatus === "sent" && (
                <div className="tour-detail-modal__alert-sent">
                  <CheckCircle size={16} />
                  Budeme Vás informovat
                </div>
              )}
            </div>
          </div>

          {/* Tabs: Description / Offers / Location */}
          <TourDetailTabs
            description={selectedOffer.description ?? undefined}
            t={t}
            offers={
              <OfferComparisonTable
                offers={sortedOffers}
                selectedId={currentTourId}
                onSelect={setSelectedOfferId}
                loading={loading}
                error={error}
                t={t}
                boardLabel={boardLabel}
              />
            }
          />

          {/* Inquiry Form */}
          <div ref={inquiryRef}>
            <TourInquiryForm tour={selectedOffer} providerLabel={providerLabel} t={t} />
          </div>

          {/* Related Tours */}
          {relatedTours.length > 0 && onNavigateToTour && (
            <RelatedTours
              tours={relatedTours}
              currentTourId={currentTourId}
              onSelect={onNavigateToTour}
              t={t}
            />
          )}
        </div>

        {/* Mobile Sticky CTA */}
        {isMobile && (
          <div className="tour-detail-modal__sticky-cta">
            <button
              type="button"
              className="tour-detail-modal__cta-btn"
              onClick={scrollToInquiry}
            >
              Poptat zájezd
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
