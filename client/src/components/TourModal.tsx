import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createInquiry } from "../api";
import { useLanguage } from "../hooks/useLanguage";

export type ModalDetail = {
  type: string;
  title: string;
  description: string;
  location: string;
  term: string;
  meta: string;
  source: string;
  photos: string[];
  isOwnTour: boolean;
  tourId?: number;
};

type Props = {
  detail: ModalDetail;
  onClose: () => void;
};

export default function TourModal({ detail, onClose }: Props) {
  const { t } = useLanguage();
  const [modalIndex, setModalIndex] = useState(0);
  const [modalEmail, setModalEmail] = useState("");
  const [modalConsent, setModalConsent] = useState(true);
  const [modalGdpr, setModalGdpr] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState("");

  useEffect(() => {
    setModalIndex(0);
    setInquiryMsg("");
    setModalEmail("");
    setModalConsent(true);
    setModalGdpr(false);
  }, [detail]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setModalIndex((prev) => (prev + 1) % detail.photos.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [detail.photos.length]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleModalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalEmail) return;
    createInquiry({
      email: modalEmail,
      destination: detail.title,
      tourId: detail.isOwnTour ? detail.tourId : undefined,
      marketingConsent: modalConsent,
      gdprConsent: modalGdpr,
      source: "tour-inquiry",
    })
      .then(() => {
        setInquiryMsg(`${t("modalSuccess")} ${modalEmail}.`);
        setModalEmail("");
        setModalConsent(true);
        setModalGdpr(false);
      })
      .catch(() => setInquiryMsg(t("modalError")));
  }

  return (
    <div id="detailModal" className="detail-modal" aria-hidden={false}>
      <div className="detail-modal__backdrop" onClick={onClose} />
      <div className="detail-modal__content">
        <button className="detail-modal__close" type="button" onClick={onClose}>
          ✕
        </button>
        <div className="detail-modal__gallery">
          <div id="modalCarouselTrack" className="modal-carousel-track">
            {detail.photos.map((photo, index) => (
              <img
                key={photo}
                className={`modal-carousel-slide${index === modalIndex ? " is-active" : ""}`}
                src={photo}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
          <button
            className="modal-carousel-arrow modal-carousel-arrow--prev"
            type="button"
            onClick={() =>
              setModalIndex((prev) => (prev - 1 + detail.photos.length) % detail.photos.length)
            }
            hidden={detail.photos.length <= 1}
          >
            ‹
          </button>
          <button
            className="modal-carousel-arrow modal-carousel-arrow--next"
            type="button"
            onClick={() => setModalIndex((prev) => (prev + 1) % detail.photos.length)}
            hidden={detail.photos.length <= 1}
          >
            ›
          </button>
          <div className="modal-carousel-dots" hidden={detail.photos.length <= 1}>
            {detail.photos.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`modal-carousel-dot${index === modalIndex ? " is-active" : ""}`}
                aria-label={`Slide ${index + 1}`}
                onClick={() => setModalIndex(index)}
              />
            ))}
          </div>
        </div>
        <div className="detail-modal__body">
          <p className="detail-modal__type">{detail.type}</p>
          <h3>{detail.title}</h3>
          <p className="detail-modal__description">{detail.description}</p>
          <div className="modal-info-grid">
            <div className="modal-info-item">
              <span>{t("modalLoc")}</span>
              <strong>{detail.location}</strong>
            </div>
            <div className="modal-info-item">
              <span>{t("modalTerm")}</span>
              <strong>{detail.term}</strong>
            </div>
            <div className="modal-info-item">
              <span>{t("modalTransportTop")}</span>
              <strong>{detail.source}</strong>
            </div>
            <div className="modal-info-item modal-info-item--price">
              <span>{t("modalPriceFrom")}</span>
              <strong>{detail.meta}</strong>
            </div>
          </div>

          {detail.isOwnTour && (
            <form className="modal-inquiry-form" onSubmit={handleModalSubmit}>
              <label htmlFor="modalEmail">{t("modalEmailLabel")}</label>
              <input
                id="modalEmail"
                type="email"
                placeholder={t("modalEmailPlaceholder")}
                value={modalEmail}
                required
                onChange={(event) => setModalEmail(event.target.value)}
              />
              <label className="modal-consent">
                <input
                  type="checkbox"
                  checked={modalConsent}
                  onChange={(event) => setModalConsent(event.target.checked)}
                />
                {t("modalConsentNews")}
              </label>
              <label className="modal-consent">
                <input
                  type="checkbox"
                  checked={modalGdpr}
                  onChange={(event) => setModalGdpr(event.target.checked)}
                  required
                />
                {t("modalConsentGdpr")} <Link to="/gdpr">{t("modalGdprLink")}.</Link>
              </label>
              <button type="submit">{t("modalSubmit")}</button>
            </form>
          )}
          {inquiryMsg && <p className="modal-inquiry-msg">{inquiryMsg}</p>}
        </div>
      </div>
    </div>
  );
}
