import { memo, useState } from "react";
import { Link } from "react-router-dom";
import type { TranslationKey } from "../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
}

function AppFooterComponent({ t }: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError(t("modalEmailPlaceholder") || "Zadejte platný e-mail");
      return;
    }
    if (!consent) {
      setError("Souhlas se zpracováním je vyžadován.");
      return;
    }
    setError("");
    setSubmitted(true);
    setEmail("");
    setConsent(false);
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
        <form className="newsletter newsletter--wide" onSubmit={handleSubmit}>
          <h4>{t("footerNewsTitle")}</h4>
          <input
            type="email"
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
          {error && <p className="newsletter__error">{error}</p>}
          {submitted ? (
            <p className="newsletter__success">{t("footerNewsSuccess")}</p>
          ) : (
            <button type="submit">{t("footerNewsBtn")}</button>
          )}
        </form>
      </div>

      <div className="container footer-bottom">
        <a href="#" className="footer-bottom__link">
          {t("navContact")}
        </a>
        <a href="#" className="footer-bottom__link">
          {t("f3_1")}
        </a>
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
