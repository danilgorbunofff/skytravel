import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { createInquiry } from "../api";
import type { TranslationKey } from "../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
}

type Status = "idle" | "sending" | "sent";

function AppFooterComponent({ t }: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const value = email.trim();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      setError(t("newsletterEmailError"));
      return;
    }
    if (!consent) {
      setError(t("newsletterConsentError"));
      return;
    }
    setError("");
    setStatus("sending");
    // Subscribing is itself the request for offers, so it is recorded as marketing consent.
    createInquiry({
      email: value,
      marketingConsent: true,
      gdprConsent: true,
      source: "footer-newsletter",
    })
      .then(() => {
        setStatus("sent");
        setEmail("");
        setConsent(false);
      })
      .catch(() => {
        setStatus("idle");
        setError(t("formSendError"));
      });
  }

  return (
    <footer id="kontakt" className="footer">
      <div className="container footer-main">
        <div>
          <h4>{t("footerCity")}</h4>
          <p>SkyTravel</p>
          <p>Křižíkova 6, Praha</p>
          <p>
            <a href="mailto:info@skytravel.cz">info@skytravel.cz</a>
          </p>
          <p>{t("footerHours")}</p>
        </div>
        <form className="newsletter newsletter--wide" onSubmit={handleSubmit} noValidate>
          <h4>{t("footerNewsTitle")}</h4>
          {status === "sent" ? (
            <p className="newsletter__success" role="status">
              {t("footerNewsSuccess")}
            </p>
          ) : (
            <>
              <input
                type="email"
                autoComplete="email"
                aria-label={t("newsletterEmailLabel")}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "newsletter-error" : undefined}
                placeholder={t("modalEmailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                {t("modalConsentGdpr")} <Link to="/gdpr">{t("modalGdprLink")}.</Link>
              </label>
              {error && (
                <p id="newsletter-error" className="newsletter__error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" ? t("formSending") : t("footerNewsBtn")}
              </button>
            </>
          )}
        </form>
      </div>

      <div className="container footer-bottom">
        <Link to="/gdpr" className="footer-bottom__link">
          {t("footerGdpr")}
        </Link>
        <Link to="/terms" className="footer-bottom__link">
          {t("footerTerms")}
        </Link>
        <span>
          &copy; <span>{new Date().getFullYear()}</span> SkyTravel
        </span>
      </div>
    </footer>
  );
}

export const AppFooter = memo(AppFooterComponent);
