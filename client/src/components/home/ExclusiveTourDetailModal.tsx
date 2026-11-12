import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle, Loader2, Plane, X, Share2, Star } from "lucide-react";
import type { OwnTour } from "../../data";
import type { TranslationKey } from "../../hooks/useLanguage";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { formatPrice } from "../../utils";
import { createInquiry } from "../../api";
import { TourGallery } from "../../features/search/components/TourGallery";

interface Props {
  tour: OwnTour;
  lang: string;
  t: (key: TranslationKey) => string;
  onClose: () => void;
}

export function ExclusiveTourDetailModal({ tour, lang, t, onClose }: Props) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [animateIn, setAnimateIn] = useState(false);
  const [shareToast, setShareToast] = useState<"copied" | "failed" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const inquiryRef = useRef<HTMLDivElement>(null);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inquiry state
  const [email, setEmail] = useState(() => localStorage.getItem("inquiry_email") ?? "");
  const [phone, setPhone] = useState("");
  const [persons, setPersons] = useState("");
  const [term, setTerm] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const i18n = tour.i18n?.[lang] ?? {};
  const destination = i18n.destination ?? tour.destination;
  const title = i18n.title ?? tour.title ?? "SkyTravel Signature";
  const description = i18n.description ?? tour.description ?? t("modalDescOwn");
  const photos = tour.photos && tour.photos.length > 0 ? tour.photos : [tour.image];

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
  }, []);

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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !containerRef.current) return;
      const focusables = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
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

  function scrollToInquiry() {
    inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // focus email after scroll
    setTimeout(() => document.getElementById("exclusiveEmail")?.focus(), 400);
  }

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof (
          navigator as Navigator & { share?: (d: { url: string; title: string }) => Promise<void> }
        ).share === "function"
      ) {
        await (
          navigator as Navigator & { share: (d: { url: string; title: string }) => Promise<void> }
        ).share({ url, title });
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
    } finally {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => setShareToast(null), 2500);
    }
  }, [title]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) {
      setErrorMsg(t("sModalErrorConsent"));
      return;
    }
    setErrorMsg("");
    setStatus("sending");
    const parts = [`Exkluzivně: ${destination} — ${title}`, `od ${formatPrice(tour.price)}`];
    if (tour.transport) parts.push(tour.transport);
    if (term) parts.push(`preferovaný termín: ${term}`);
    if (persons) parts.push(`osob: ${persons}`);
    const destinationLine = parts.join(" · ");
    const combinedMessage =
      [term ? `Preferovaný termín: ${term}` : "", persons ? `Počet osob: ${persons}` : "", message]
        .filter(Boolean)
        .join("\n") || undefined;
    try {
      await createInquiry({
        email,
        destination: destinationLine,
        tourId: tour.id,
        gdprConsent: true,
        source: "exclusive-tour",
        phone: phone || undefined,
        message: combinedMessage,
        marketingConsent: false,
      });
      localStorage.setItem("inquiry_email", email);
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg(t("sModalErrorSend"));
    }
  }

  return (
    <div
      ref={containerRef}
      className={`tour-detail-modal exclusive-detail${animateIn ? " is-open" : ""}${isMobile ? " tour-detail-modal--mobile" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exclusive-detail-title"
    >
      <div className="tour-detail-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="tour-detail-modal__content">
        {isMobile && (
          <div className="tour-detail-modal__mobile-header">
            <h3 id="exclusive-detail-title" className="tour-detail-modal__mobile-title">
              {destination}
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

        <TourGallery photos={photos} alt={destination} />

        {shareToast && (
          <div
            className={`tour-detail-modal__toast ${shareToast === "copied" ? "is-success" : "is-error"}`}
          >
            {shareToast === "copied" ? "Odkaz zkopírován" : "Sdílení se nezdařilo"}
          </div>
        )}

        <div className="tour-detail-modal__body">
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
                <span className="exclusive-detail__badge">SkyTravel Signature · exkluzivně</span>
                <h2 id="exclusive-detail-title">{destination}</h2>
                <p className="tour-detail-modal__subtitle">{title}</p>
              </div>
            </>
          )}

          {isMobile && (
            <div className="tour-detail-modal__header">
              <span className="exclusive-detail__badge">SkyTravel Signature · exkluzivně</span>
              <p className="tour-detail-modal__subtitle">{title}</p>
            </div>
          )}

          <div className="tour-detail-modal__facts">
            <div className="tour-detail-modal__fact">
              <Calendar size={16} />
              <span>Flexibilní termín — na dotaz</span>
            </div>
            {tour.transport && (
              <div className="tour-detail-modal__fact">
                <Plane size={16} />
                <span>
                  {tour.transport === "plane"
                    ? "Letecky"
                    : tour.transport === "bus"
                      ? "Autobusem"
                      : tour.transport}
                </span>
              </div>
            )}
            <div className="tour-detail-modal__fact">
              <Star size={16} />
              <span>od {formatPrice(tour.price)} / os.</span>
            </div>
          </div>

          <div className="exclusive-detail__layout">
            <div className="exclusive-detail__main">
              <section className="exclusive-detail__section">
                <h3>O zájezdu</h3>
                <p className="exclusive-detail__desc">{description}</p>
              </section>

              <section className="exclusive-detail__section">
                <h3>Proč si vybrat</h3>
                <ul className="exclusive-detail__bullets">
                  <li>Pečlivě vybrané ubytování v nejlepší poloze</li>
                  <li>Doprava a transfery přesně podle vašeho přání</li>
                  <li>Asistence SkyTravel před odletem i na místě</li>
                  <li>Program na míru — výlety a zážitky dle vás</li>
                </ul>
              </section>

              <section className="exclusive-detail__section exclusive-detail__section--muted">
                <h3>Co je typicky v ceně</h3>
                <p>
                  Ubytování, vybraná doprava, základní servis agentury a doporučený program. Přesný
                  rozsah ladíme při nezávazné poptávce — podle termínu a počtu osob.
                </p>
              </section>
            </div>

            <div ref={inquiryRef} className="exclusive-detail__aside">
              <div className="exclusive-detail__price">
                <CheckCircle size={18} className="exclusive-detail__price-icon" />
                <div>
                  <div className="exclusive-detail__price-amount">{formatPrice(tour.price)}</div>
                  <div className="exclusive-detail__price-note">od / os. · nezávazně</div>
                </div>
              </div>

              {status === "sent" ? (
                <div className="tour-inquiry-form tour-inquiry-form--success">
                  <CheckCircle size={32} />
                  <h4>Děkujeme za zájem!</h4>
                  <p>
                    Ozveme se do 24 hodin na <strong>{email}</strong>.
                  </p>
                </div>
              ) : (
                <form className="exclusive-detail__form" onSubmit={handleSubmit}>
                  <div className="exclusive-detail__form-head">
                    <Star size={14} />
                    <span>Nezávazná poptávka</span>
                  </div>

                  <input
                    id="exclusiveEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("sModalEmailPlaceholder")}
                    required
                    className="tour-inquiry-form__input"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefon (volitelný)"
                    className="tour-inquiry-form__input"
                  />
                  <div className="exclusive-detail__row">
                    <input
                      type="text"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="Preferovaný termín (např. 12.–19. 7.)"
                      className="tour-inquiry-form__input"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={persons}
                      onChange={(e) => setPersons(e.target.value)}
                      placeholder="Osob (např. 2+1)"
                      className="tour-inquiry-form__input"
                    />
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Vaše přání — odlet z, strava, poznámky…"
                    className="tour-inquiry-form__textarea"
                    rows={3}
                  />

                  <label className="tour-inquiry-form__consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      required
                    />
                    <span>
                      {t("sModalConsentPre")} <Link to="/gdpr">{t("sModalConsentLink")}</Link>.
                    </span>
                  </label>

                  {errorMsg && <p className="tour-inquiry-form__error">{errorMsg}</p>}

                  <button
                    type="submit"
                    className="exclusive-detail__submit"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Odesílám…
                      </>
                    ) : (
                      "Nezávazně poptat"
                    )}
                  </button>
                  <p className="exclusive-detail__trust">
                    Odpovíme do 24 h · tel. +420 721 163 860
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {isMobile && (
          <div className="tour-detail-modal__sticky-cta">
            <button type="button" className="tour-detail-modal__cta-btn" onClick={scrollToInquiry}>
              Nezávazně poptat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
