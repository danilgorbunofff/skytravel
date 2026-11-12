import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { useFocusTrap } from "../features/search/hooks/useFocusTrap";

type Props = {
  showLeadPopup: boolean;
  dismissLeadPopup: () => void;
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
  dismissLeadPopup,
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
  const trapRef = useFocusTrap(showLeadPopup);

  useEffect(() => {
    if (!showLeadPopup) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismissLeadPopup();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showLeadPopup, dismissLeadPopup]);

  if (!showLeadPopup) return null;

  return (
    <div
      className="lead-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
      ref={trapRef}
    >
      <div className="lead-modal__backdrop" onClick={dismissLeadPopup} aria-hidden="true" />
      <div className="lead-modal__card">
        <button
          className="lead-modal__close"
          type="button"
          onClick={dismissLeadPopup}
          aria-label={t("sModalClose")}
        >
          <span aria-hidden="true">✕</span>
        </button>
        <div className="lead-modal__content">
          <div className="lead-modal__badge">{t("leadBadge")}</div>
          <h3 id="lead-modal-title">{prefilledQuery ? t("leadTitleNoResults") : t("leadTitle")}</h3>
          <p>{t("leadDesc")}</p>
          {!leadSubmitted ? (
            <form className="lead-modal__form" onSubmit={handleLeadSubmit}>
              <input
                type="email"
                placeholder={t("modalEmailPlaceholder")}
                aria-label={t("modalEmailPlaceholder")}
                autoComplete="email"
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                required
              />
              <label className="lead-modal__consent">
                <input
                  type="checkbox"
                  checked={leadConsent}
                  onChange={(event) => setLeadConsent(event.target.checked)}
                />
                <span>{t("leadConsentNews")}</span>
              </label>
              <label className="lead-modal__consent">
                <input
                  type="checkbox"
                  checked={leadGdpr}
                  onChange={(event) => setLeadGdpr(event.target.checked)}
                  required
                />
                <span>
                  {t("modalConsentGdpr")} <Link to="/gdpr">{t("modalGdprLink")}</Link>.
                </span>
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
