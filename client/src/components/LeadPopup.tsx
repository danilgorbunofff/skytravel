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
}: Props) {
  const { t } = useLanguage();

  if (!showLeadPopup) return null;

  return (
    <div className="lead-modal" role="dialog" aria-modal="true" aria-label="Exkluzivní nabídky">
      <div className="lead-modal__backdrop" onClick={() => setShowLeadPopup(false)} />
      <div className="lead-modal__card">
        <button className="lead-modal__close" type="button" onClick={() => setShowLeadPopup(false)}>
          ✕
        </button>
        <div className="lead-modal__content">
          <div className="lead-modal__badge">{t("leadBadge")}</div>
          <h3>{t("leadTitle")}</h3>
          <p>{t("leadDesc")}</p>
          {!leadSubmitted ? (
            <form className="lead-modal__form" onSubmit={handleLeadSubmit}>
              <input
                type="email"
                placeholder={t("modalEmailPlaceholder")}
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
              {leadError && <p className="lead-modal__error">{leadError}</p>}
              <button type="submit">{t("leadSubmit")}</button>
            </form>
          ) : (
            <div className="lead-modal__success">
              {t("leadSuccess")} {leadEmail}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
