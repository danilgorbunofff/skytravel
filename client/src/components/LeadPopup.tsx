import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";

type Props = {
  showLeadPopup: boolean;
  setShowLeadPopup: (v: boolean) => void;
  leadEmail: string;
  setLeadEmail: (v: string) => void;
  leadSubmitted: boolean;
  leadConsent: boolean;
  setLeadConsent: (v: boolean) => void;
  leadGdpr: boolean;
  setLeadGdpr: (v: boolean) => void;
  leadError: string;
  handleLeadSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  prefilledQuery?: string;
  prefilledDateStart?: string;
};

export default function LeadPopup({
  showLeadPopup,
  setShowLeadPopup,
  leadEmail,
  setLeadEmail,
  leadSubmitted,
  leadConsent,
  setLeadConsent,
  leadGdpr,
  setLeadGdpr,
  leadError,
  handleLeadSubmit,
  prefilledQuery,
}: Props) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the dialog and returns to where it was on close.
  useEffect(() => {
    if (!showLeadPopup) return;
    const previous = document.activeElement as HTMLElement | null;
    cardRef.current?.querySelector<HTMLElement>("input[type=email], button")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowLeadPopup(false);
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [showLeadPopup, setShowLeadPopup]);

  if (!showLeadPopup) return null;

  return (
    <div className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
      <div
        className="lead-modal__backdrop"
        onClick={() => setShowLeadPopup(false)}
        aria-hidden="true"
      />
      <div className="lead-modal__card" ref={cardRef}>
        <button
          className="lead-modal__close"
          type="button"
          aria-label={t("sAriaClose")}
          onClick={() => setShowLeadPopup(false)}
        >
          <span aria-hidden="true">✕</span>
        </button>
        <div className="lead-modal__content">
          <div className="lead-modal__badge">{t("leadBadge")}</div>
          <h3 id="lead-modal-title">
            {prefilledQuery ? `Nenašli jste vhodný zájezd do ${prefilledQuery}?` : t("leadTitle")}
          </h3>
          <p>{t("leadDesc")}</p>
          {!leadSubmitted ? (
            <form className="lead-modal__form" onSubmit={handleLeadSubmit}>
              <label className="form-field">
                <span className="form-field__label">{t("newsletterEmailLabel")}</span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={t("modalEmailPlaceholder")}
                  value={leadEmail}
                  onChange={(event) => setLeadEmail(event.target.value)}
                  required
                />
              </label>
              <label className="lead-modal__consent">
                <input
                  type="checkbox"
                  checked={leadConsent}
                  onChange={(event) => setLeadConsent(event.target.checked)}
                />
                {t("leadConsentNews")}
              </label>
              <label className="lead-modal__consent">
                <input
                  type="checkbox"
                  checked={leadGdpr}
                  onChange={(event) => setLeadGdpr(event.target.checked)}
                  required
                />
                {t("modalConsentGdpr")} <Link to="/gdpr">{t("modalGdprLink")}.</Link>
              </label>
              {leadError && (
                <p className="lead-modal__error" role="alert">
                  {leadError}
                </p>
              )}
              <button type="submit">{t("leadSubmit")}</button>
            </form>
          ) : (
            <div className="lead-modal__success" role="status">
              {t("leadSuccess")} {leadEmail}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
