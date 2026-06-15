import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Loader2, Star } from "lucide-react";
import { createInquiry } from "../../../api";
import { formatPrice } from "../../../utils";
import { fmtDate } from "../../../lib/formatters";
import type { UnifiedTour } from "../../../types/providers";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  tour: UnifiedTour;
  providerLabel: string;
  t: (key: TranslationKey) => string;
}

function getPrefillFromUrl(): { email: string; phone: string } {
  if (typeof window === "undefined") return { email: "", phone: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    email: params.get("email") ?? localStorage.getItem("inquiry_email") ?? "",
    phone: params.get("phone") ?? "",
  };
}

export function TourInquiryForm({ tour, providerLabel, t }: Props) {
  const prefill = getPrefillFromUrl();
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setErrorMsg(t("sModalErrorConsent"));
      return;
    }
    setErrorMsg("");
    setStatus("sending");
    try {
      await createInquiry({
        email,
        destination: `${providerLabel}: ${tour.title}, ${tour.destination}, ${fmtDate(tour.startDate)} - ${fmtDate(tour.endDate)}, ${formatPrice(tour.price)}`,
        gdprConsent: true,
        source: "provider-tour-modal",
        phone: phone || undefined,
        message: message || undefined,
      });
      localStorage.setItem("inquiry_email", email);
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg(t("sModalErrorSend"));
    }
  }

  if (status === "sent") {
    return (
      <div className="tour-inquiry-form tour-inquiry-form--success">
        <CheckCircle size={32} />
        <h4>Děkujeme za Váš zájem!</h4>
        <p>Odpovíme Vám do 24 hodin na <strong>{email}</strong>.</p>
      </div>
    );
  }

  return (
    <form className="tour-inquiry-form" onSubmit={handleSubmit}>
      <div className="tour-inquiry-form__header">
        <Star size={16} />
        <span>Nezávazná poptávka</span>
      </div>

      <div className="tour-inquiry-form__fields">
        <input
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
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Poznámka (volitelná)"
          className="tour-inquiry-form__textarea"
          rows={3}
        />
      </div>

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
        className="tour-inquiry-form__submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? (
          <><Loader2 size={16} className="animate-spin" /> Odesílám...</>
        ) : (
          t("sModalSubmit")
        )}
      </button>

      <p className="tour-inquiry-form__alt">
        Nebo zavolejte: <a href="tel:+420721163860">+420 721 163 860</a>
      </p>
    </form>
  );
}
